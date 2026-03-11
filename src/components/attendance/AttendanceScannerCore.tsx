"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { parseInOut } from "@/lib/attendance/parseInOut";
import {
  computeBusinessDayFromUtc,
  getConfiguredCutoffHour,
} from "@/lib/attendanceDay";
import PendingRegistrationCard from "./PendingRegistrationCard";
import {
  IconLogin2,
  IconLogout2,
  IconArrowLeft,
  IconHandFinger,
  IconCheck,
  IconAlertTriangle,
  IconListCheck,
  IconClipboardOff,
} from "@tabler/icons-react";

/* ─── types ─── */
interface Detection {
  raw: string;
  ts: number;
  mode: "IN" | "OUT";
}
interface AttConfirm {
  person: { id: string; name: string; code: string };
  businessDay?: string;
  at: Date;
}

/* ─── props ─── */
export interface AttendanceScannerCoreProps {
  /** Where the "Volver" link points — '/u' or '/admin' */
  backHref: string;
  /** Login redirect path, e.g. '/u/login' */
  loginPath?: string;
}

/* ─────────────────────────────────────────────────── */
export default function AttendanceScannerCore({
  backHref,
  loginPath = "/u/login",
}: AttendanceScannerCoreProps) {
  /* state */
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{
    personName?: string;
    dni?: string;
  } | null>(null);

  const lastRef = useRef<Detection | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>();
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const audioOkRef = useRef<HTMLAudioElement | null>(null);
  const audioWarnRef = useRef<HTMLAudioElement | null>(null);
  const flashRef = useRef<{ ts: number; kind: "OK" | "WARN" } | null>(null);
  const [, forceFlashRerender] = useState(0);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recent, setRecent] = useState<any | null>(null);
  const recentRef = useRef<any | null>(null);
  const [entryRegistered, setEntryRegistered] = useState<AttConfirm | null>(
    null,
  );
  const [exitRegistered, setExitRegistered] = useState<AttConfirm | null>(null);
  // Task-checking state: after entry, detect if user has tasks for the day
  const [checkingTasks, setCheckingTasks] = useState(false);
  const [hasTasks, setHasTasks] = useState<boolean | null>(null); // null = not checked yet
  const [pendingMode, setPendingMode] = useState<null | "IN" | "OUT">(null);
  const expectedRef = useRef<"IN" | "OUT" | null>(null);
  const scanningRef = useRef(true);
  const markControllerRef = useRef<AbortController | null>(null);
  const recentControllerRef = useRef<AbortController | null>(null);
  const meControllerRef = useRef<AbortController | null>(null);
  const pendingTimerRef = useRef<number | null>(null);
  const [pendingTooLong, setPendingTooLong] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* helpers */
  const selfUrl = `${backHref === "/admin" ? "/admin" : "/u"}/assistance`;

  function triggerFlash(kind: "OK" | "WARN") {
    flashRef.current = { ts: Date.now(), kind };
    forceFlashRerender((v) => v + 1);
  }

  function getOrCreateDeviceId() {
    try {
      const k = "attScannerDeviceId";
      let v = localStorage.getItem(k);
      if (!v) {
        v = crypto.randomUUID();
        localStorage.setItem(k, v);
      }
      return v;
    } catch {
      return undefined;
    }
  }

  function safeVibrate(pattern: number | number[]) {
    try {
      (navigator as any).vibrate?.(pattern);
    } catch {}
  }

  function startPendingTimeout() {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = window.setTimeout(() => {
      setPendingTooLong(true);
    }, 4000);
  }
  function clearPendingTimeout() {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }

  /* ─ expected override from URL ─ */
  useEffect(() => {
    try {
      const usp = new URL(window.location.href).searchParams;
      const exp = (usp.get("expected") || "").toUpperCase();
      if (exp === "IN" || exp === "OUT")
        expectedRef.current = exp as "IN" | "OUT";
    } catch {}
  }, []);

  /* ─ fetch recent ─ */
  const fetchRecent = useCallback(() => {
    try {
      recentControllerRef.current?.abort();
    } catch {}
    const ac = new AbortController();
    recentControllerRef.current = ac;
    fetch("/api/attendance/me/recent", { cache: "no-store", signal: ac.signal })
      .then((r) => {
        if (r.status === 401) {
          window.location.href =
            loginPath + "?next=" + encodeURIComponent(selfUrl);
          return null;
        }
        return r.json();
      })
      .then((j) => {
        if (j && j.ok) {
          setRecent(j);
          recentRef.current = j;
        }
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
      });
  }, [loginPath, selfUrl]);

  /* ─ fetch me ─ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        try {
          meControllerRef.current?.abort();
        } catch {}
        const ac = new AbortController();
        meControllerRef.current = ac;
        const r = await fetch("/api/user/me", {
          cache: "no-store",
          signal: ac.signal,
        });
        if (r.status === 401) return;
        const j = await r.json().catch(() => ({}));
        if (!cancelled && r.ok && j?.ok && j.user) {
          setMe({ personName: j.user.personName, dni: j.user.dni });
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
      meControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);
  useEffect(() => {
    recentRef.current = recent;
  }, [recent]);

  /* ─ deriveNextMode ─ */
  function deriveNextMode(): "IN" | "OUT" {
    const r = recentRef.current;
    const last = r?.recent;
    if (!last) return "IN";
    const currentBD = computeBusinessDayFromUtc(
      new Date(),
      getConfiguredCutoffHour(),
    );
    if (last.businessDay !== currentBD) return "IN";
    return last.type === "IN" ? "OUT" : "IN";
  }

  /* ─ camera + scan loop ─ */
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function init() {
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        if ("BarcodeDetector" in window) {
          detectorRef.current = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });
          loop();
        } else {
          const reader = new BrowserMultiFormatReader();
          zxingReaderRef.current = reader;
          await reader.decodeFromConstraints(
            { video: { facingMode: "environment" } },
            videoRef.current!,
            (result) => {
              if (registering) return;
              if (result) {
                try {
                  const raw = result.getText();
                  if (raw) handleRawCandidate(raw);
                } catch {}
              }
            },
          );
        }
      } catch (e: any) {
        setError(e?.message || "No se pudo acceder a la cámara");
      }
    }

    function loop() {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(loop);
      scanOnce();
    }
    async function scanOnce() {
      const det = detectorRef.current;
      if (!det || !videoRef.current || registering) return;
      try {
        const detections = await det.detect(videoRef.current);
        if (detections?.length) {
          for (const d of detections) {
            const raw = d.rawValue || "";
            if (!raw) continue;
            handleRawCandidate(raw);
            break;
          }
        }
      } catch {}
    }

    function handleRawCandidate(raw: string) {
      if (!scanningRef.current) return;
      const fallback = deriveNextMode();
      const { mode } = parseInOut(raw, fallback);
      if (!mode) return;
      const nextExpected = deriveNextMode();
      const override = expectedRef.current;
      const lastType = recentRef.current?.recent?.type as
        | "IN"
        | "OUT"
        | undefined;
      if (lastType && lastType === mode) return;
      if (mode !== nextExpected && !(override && mode === override)) {
        audioWarnRef.current?.play().catch(() => {});
        triggerFlash("WARN");
        setMessage(
          `Se esperaba un código de ${override || nextExpected}. Escaneaste ${mode}.`,
        );
        setTimeout(() => {
          setMessage((m) =>
            m && m.startsWith("Se esperaba") ? null : m,
          );
        }, 3500);
        return;
      }
      const last = lastRef.current;
      if (last && Date.now() - last.ts < 3000 && last.mode === mode) return;
      lastRef.current = { raw, ts: Date.now(), mode };
      doRegister(mode, raw);
      if (override && mode === override) expectedRef.current = null;
    }

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      try {
        zxingReaderRef.current?.reset();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registering]);

  /* ─ doRegister ─ */
  async function doRegister(mode: "IN" | "OUT", _raw: string) {
    setRegistering(true);
    setMessage(null);
    setPendingMode(mode);
    setPendingTooLong(false);
    scanningRef.current = false;
    try {
      audioOkRef.current?.play().catch(() => {});
      triggerFlash("OK");
    } catch {}
    safeVibrate(mode === "IN" ? 20 : 30);
    startPendingTimeout();
    try {
      markControllerRef.current?.abort();
    } catch {}
    const ac = new AbortController();
    markControllerRef.current = ac;
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, deviceId }),
        signal: ac.signal,
      });
      if (res.status === 401) {
        window.location.href =
          loginPath + "?next=" + encodeURIComponent(selfUrl);
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        const code = j?.code;
        if (code === "DUPLICATE" || code === "ALREADY_TODAY") return;
        audioWarnRef.current?.play().catch(() => {});
        triggerFlash("WARN");
        let friendly = "Error registrando.";
        if (code === "NO_IN_TODAY") friendly = "No tienes una ENTRADA previa.";
        else if (code === "OUT_COOLDOWN")
          friendly =
            "Debes esperar unos segundos antes de marcar SALIDA.";
        else if (code === "PERSON_INACTIVE")
          friendly = "Tu usuario está inactivo.";
        else if (code === "RATE_LIMIT")
          friendly = "Demasiados intentos, espera un momento.";
        else if (code === "BAD_PASSWORD") friendly = "Password incorrecto.";
        setMessage(friendly);
      } else {
        fetchRecent();
        const confirm: AttConfirm = {
          person: j.person,
          businessDay: j.businessDay || j.utcDay,
          at: new Date(),
        };
        if (mode === "IN") {
          setEntryRegistered(confirm);
          // Check if user has tasks for the day → auto-redirect if yes
          setCheckingTasks(true);
          const bday = confirm.businessDay || computeBusinessDayFromUtc(new Date(), getConfiguredCutoffHour());
          fetch(`/api/tasks/list?day=${encodeURIComponent(bday)}`, { cache: 'no-store' })
            .then(r => r.ok ? r.json() : null)
            .then(j => {
              if (j && Array.isArray(j.tasks) && j.tasks.length > 0) {
                // Has tasks → redirect directly
                window.location.href = `/u/checklist?day=${encodeURIComponent(bday)}&mode=IN`;
              } else {
                setHasTasks(false);
                setCheckingTasks(false);
              }
            })
            .catch(() => { setHasTasks(false); setCheckingTasks(false); });
        } else {
          setExitRegistered(confirm);
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        audioWarnRef.current?.play().catch(() => {});
        triggerFlash("WARN");
        setMessage("Error de red.");
      }
    } finally {
      clearPendingTimeout();
      setRegistering(false);
      setTimeout(() => {
        setMessage((m) => (m && m.startsWith("✓") ? null : m));
      }, 3000);
      setPendingMode(null);
    }
  }

  function manualFallback() {
    window.location.href = "/u/manual";
  }

  /* ─ derived ─ */
  const nextExpected = deriveNextMode();
  const isEntry = nextExpected === "IN";
  const collaboratorName =
    entryRegistered?.person?.name ||
    exitRegistered?.person?.name ||
    recent?.recent?.name ||
    me?.personName ||
    "";
  const firstName = collaboratorName.split(/\s+/)[0] || "";

  const showScanner = !entryRegistered && !exitRegistered && !pendingMode;

  /* palette based on mode */
  const pal = isEntry
    ? {
        accent: "emerald",
        badge: "bg-emerald-600 text-white",
        corner: "border-emerald-400",
        glow: "drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]",
        scanline: "via-emerald-400",
        dot: "bg-emerald-500",
      }
    : {
        accent: "indigo",
        badge: "bg-indigo-600 text-white",
        corner: "border-indigo-400",
        glow: "drop-shadow-[0_0_6px_rgba(99,102,241,0.8)]",
        scanline: "via-indigo-400",
        dot: "bg-indigo-500",
      };

  /* ─── JSX ─── */
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-5 text-gray-900 dark:text-slate-100">
      <audio ref={audioOkRef} src="/sounds/scan-ok.mp3" preload="auto" />
      <audio ref={audioWarnRef} src="/sounds/scan-warn.mp3" preload="auto" />

      {/* Flash overlay */}
      {flashRef.current && Date.now() - flashRef.current.ts < 650 && (
        <div
          className={`pointer-events-none fixed inset-0 z-40 flex items-center justify-center ${flashRef.current.kind === "OK" ? "bg-emerald-500/10" : "bg-amber-600/10"}`}
        >
          <div
            className={`rounded-full h-28 w-28 flex items-center justify-center ring-4 ${flashRef.current.kind === "OK" ? "bg-emerald-500/80 ring-emerald-300" : "bg-amber-600/80 ring-amber-300"} animate-attpulse`}
          >
            {flashRef.current.kind === "OK" ? (
              <IconCheck className="h-14 w-14 text-white" stroke={2.5} />
            ) : (
              <IconAlertTriangle className="h-14 w-14 text-white" stroke={2} />
            )}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-4">
        {/* ── Header ── */}
        {showScanner && (
          <div className="space-y-2">
            {/* Mode badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ${pal.badge}`}
              >
                {isEntry ? (
                  <IconLogin2 className="w-3.5 h-3.5" />
                ) : (
                  <IconLogout2 className="w-3.5 h-3.5" />
                )}
                {isEntry ? "ENTRADA" : "SALIDA"}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight leading-tight">
              {isEntry ? (
                <>
                  Hola{firstName ? `, ${firstName}` : ""}, escanea el código
                  para registrar tu{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    entrada
                  </span>
                </>
              ) : (
                <>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    Buen trabajo
                  </span>
                  {firstName ? `, ${firstName}` : ""}. Escanea para registrar
                  tu{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    salida
                  </span>
                </>
              )}
            </h1>
          </div>
        )}

        {/* ── Pending ── */}
        {pendingMode && !entryRegistered && !exitRegistered && (
          <PendingRegistrationCard
            mode={pendingMode}
            pendingTooLong={pendingTooLong}
            onRetry={() => {
              try {
                markControllerRef.current?.abort();
              } catch {}
              clearPendingTimeout();
              setPendingMode(null);
              setPendingTooLong(false);
              scanningRef.current = true;
            }}
            onCancel={() => {
              try {
                markControllerRef.current?.abort();
              } catch {}
              clearPendingTimeout();
              setPendingMode(null);
              setPendingTooLong(false);
              scanningRef.current = true;
              setMessage("Cancelado.");
            }}
          />
        )}

        {/* ── Entry confirmation ── */}
        {entryRegistered && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-5 space-y-4 animate-fadeIn shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <IconCheck className="h-6 w-6 text-white" stroke={2.5} />
              </div>
              <div>
                <div className="text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                  Entrada registrada
                </div>
                <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                  {entryRegistered.at.toLocaleTimeString()} ·{" "}
                  {entryRegistered.at.toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-sm text-emerald-800 dark:text-emerald-200 space-y-1 pl-[52px]">
              <div>
                <span className="text-emerald-600/80 dark:text-emerald-400/80">
                  Nombre:
                </span>{" "}
                {entryRegistered.person.name}
              </div>
              <div>
                <span className="text-emerald-600/80 dark:text-emerald-400/80">
                  Código:
                </span>{" "}
                {entryRegistered.person.code}
              </div>
              {entryRegistered.businessDay && (
                <div>
                  <span className="text-emerald-600/80 dark:text-emerald-400/80">
                    Jornada:
                  </span>{" "}
                  {entryRegistered.businessDay}
                </div>
              )}
            </div>

            {/* Task-aware actions */}
            <div className="pt-1 space-y-2">
              {checkingTasks && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <span className="inline-block h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Verificando lista de tareas…
                </div>
              )}
              {!checkingTasks && hasTasks === false && (
                <div className="flex items-center gap-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3.5 py-3 text-sm text-slate-600 dark:text-slate-400">
                  <IconClipboardOff className="w-5 h-5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                  <span>No tienes lista de tareas pendientes para hoy.</span>
                </div>
              )}
              <a
                href={backHref}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 shadow-sm transition"
              >
                <IconArrowLeft className="w-4 h-4" />
                Volver al panel
              </a>
            </div>
          </div>
        )}

        {/* ── Scanner viewport ── */}
        {showScanner && (
          <>
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full aspect-[4/3] object-cover bg-black"
                  muted
                  playsInline
                />
                {/* Scan frame overlay */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-[68%] aspect-square relative">
                    {/* Corner markers */}
                    <div
                      className={`absolute top-0 left-0 h-8 w-8 border-t-[3px] border-l-[3px] ${pal.corner} rounded-tl-md ${pal.glow}`}
                    />
                    <div
                      className={`absolute top-0 right-0 h-8 w-8 border-t-[3px] border-r-[3px] ${pal.corner} rounded-tr-md ${pal.glow}`}
                    />
                    <div
                      className={`absolute bottom-0 left-0 h-8 w-8 border-b-[3px] border-l-[3px] ${pal.corner} rounded-bl-md ${pal.glow}`}
                    />
                    <div
                      className={`absolute bottom-0 right-0 h-8 w-8 border-b-[3px] border-r-[3px] ${pal.corner} rounded-br-md ${pal.glow}`}
                    />
                    {/* Animated scan line */}
                    <div
                      className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${pal.scanline} to-transparent animate-scanline`}
                    />
                  </div>
                </div>
                {/* Mode indicator overlay */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span
                    className={`${pal.badge} rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider shadow`}
                  >
                    {isEntry ? "IN" : "OUT"}
                  </span>
                  <div className="flex items-center gap-1.5 rounded-md bg-black/40 backdrop-blur-sm px-2 py-0.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${pal.dot} animate-pulse`}
                    />
                    <span className="text-[10px] text-white/80 font-medium">
                      Escaneando
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-2">
                {error && (
                  <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {error}
                  </div>
                )}
                <button
                  onClick={manualFallback}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 active:scale-[.985] transition"
                >
                  <IconHandFinger className="w-4 h-4" />
                  Modo manual
                </button>
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div
                className={`rounded-lg px-3 py-2.5 text-sm border shadow-sm animate-fadeIn ${message.startsWith("✓") ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300" : "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300"}`}
              >
                {message}
              </div>
            )}

            {/* Hint */}
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {isEntry
                ? "Apunta la cámara al código QR de ENTRADA."
                : "Apunta la cámara al código QR de SALIDA."}
            </div>

            {/* Last record */}
            {recent?.recent && (
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${recent.recent.type === "IN" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"}`}
                >
                  {recent.recent.type === "IN" ? "IN" : "OUT"}
                </span>
                {recent.recent.scannedAt &&
                  new Date(recent.recent.scannedAt).toLocaleTimeString()}
                {recent.recent.businessDay && ` · ${recent.recent.businessDay}`}
              </div>
            )}
          </>
        )}

        {/* ── Exit confirmation ── */}
        {exitRegistered && (
          <div className="rounded-xl border border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 p-5 space-y-4 shadow-md animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                <IconLogout2 className="h-6 w-6 text-white" stroke={2} />
              </div>
              <div>
                <div className="text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                  Salida registrada
                </div>
                <div className="text-xs text-indigo-600/80 dark:text-indigo-400/80">
                  {exitRegistered.at.toLocaleTimeString()} ·{" "}
                  {exitRegistered.at.toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-sm text-indigo-800 dark:text-indigo-200 space-y-1 pl-[52px]">
              <div>
                <span className="text-indigo-600/80 dark:text-indigo-400/80">
                  Nombre:
                </span>{" "}
                {exitRegistered.person.name}
              </div>
              <div>
                <span className="text-indigo-600/80 dark:text-indigo-400/80">
                  Código:
                </span>{" "}
                {exitRegistered.person.code}
              </div>
              {exitRegistered.businessDay && (
                <div>
                  <span className="text-indigo-600/80 dark:text-indigo-400/80">
                    Jornada:
                  </span>{" "}
                  {exitRegistered.businessDay}
                </div>
              )}
            </div>
            <div className="text-xs text-indigo-600/80 dark:text-indigo-400/80 pl-[52px]">
              ¡Buen trabajo hoy! Descansa y nos vemos en tu próxima jornada.
            </div>
            <div className="pt-1">
              <a
                href={backHref}
                className="block w-full text-center px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-sm font-semibold text-white shadow transition focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600"
              >
                Volver al panel
              </a>
            </div>
          </div>
        )}

        {/* ── Back link ── */}
        <a
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <IconArrowLeft className="w-3.5 h-3.5" />
          Volver
        </a>
      </div>

      <style jsx global>{`
        @keyframes attpulse {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          40% {
            transform: scale(1.05);
            opacity: 1;
          }
          70% {
            transform: scale(0.97);
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        .animate-attpulse {
          animation: attpulse 650ms cubic-bezier(0.16, 0.8, 0.3, 1);
        }
        @keyframes scanlineMove {
          0% {
            transform: translateY(0);
            opacity: 0.15;
          }
          45% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(calc(100% - 2px));
            opacity: 0.15;
          }
        }
        .animate-scanline {
          animation: scanlineMove 2.6s cubic-bezier(0.45, 0.05, 0.55, 0.95)
            infinite;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 350ms ease-out;
        }
      `}</style>
    </div>
  );
}
