"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
type Result = { getText(): string };

type Person = { id: string; name: string; code: string };
type ScanOk = { ok: true; person: Person; scanId?: string; alerts?: string[] };
type ScanErr = {
  ok: false;
  code:
    | "BAD_REQUEST"
    | "RATE_LIMIT"
    | "INVALID_VERSION"
    | "INVALID_SIGNATURE"
    | "INVALID_TS"
    | "FUTURE_TS"
    | "STALE"
    | "PERSON_NOT_FOUND"
    | "PERSON_INACTIVE"
    | "DUPLICATE"
    | "REPLAY"
    | string;
  person?: Person;
  lastScanAt?: string;
  alerts?: string[];
};

type PersonQrPayload = { pid: string; ts: string; v?: number; sig: string };
type Mode = "IN" | "OUT";
type GlobalQrPayload = { kind: "GLOBAL"; mode: Mode; v?: number };

// Small helpers --------------------------------------------------------------
function ensureDeviceId(): string {
  const key = "scannerDeviceId";
  let v = localStorage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(key, v);
  }
  return v;
}

function base64UrlToJson<T = unknown>(s: string): T | null {
  try {
    const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const str = atob(b64);
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

function decodePersonPayloadFromQr(text: string): PersonQrPayload | null {
  // Try as JSON directly
  try {
    const j = JSON.parse(text);
    if (j && typeof j === "object" && j.pid && j.ts && j.sig) return j as PersonQrPayload;
  } catch {}
  // Try base64url encoded JSON
  const j = base64UrlToJson<PersonQrPayload>(text);
  if (j && j.pid && j.ts && j.sig) return j;
  return null;
}

function decodeGlobalModeFromQr(text: string): Mode | null {
  // Try JSON direct
  try {
    const j = JSON.parse(text);
    if (j && typeof j === "object" && j.kind === "GLOBAL" && (j.mode === "IN" || j.mode === "OUT")) {
      return j.mode as Mode;
    }
  } catch {}
  // Try base64url JSON
  const j = base64UrlToJson<GlobalQrPayload>(text);
  if (j && j.kind === "GLOBAL" && (j.mode === "IN" || j.mode === "OUT")) return j.mode;
  return null;
}

function beep(freq = 880, duration = 120, type: OscillatorType = "sine", volume = 0.08) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.value = volume;
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, duration);
  } catch {}
}

function vibrate(ms = 80) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {}
}

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const processingRef = useRef(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [banner, setBanner] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [overlay, setOverlay] = useState<{ person: Person; lastScanAt?: string } | null>(null);
  const [mode, setMode] = useState<Mode>("IN");
  const [awaitingCode, setAwaitingCode] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");

  const inCooldown = useMemo(() => Date.now() < cooldownUntil, [cooldownUntil]);

  const processDecodedText = useCallback(async (text: string) => {
    if (!text) return;
    if (processingRef.current || inCooldown) return;
    // If we're awaiting code entry from a GLOBAL QR selection, ignore further scans temporarily
    if (awaitingCode) return;
    processingRef.current = true;

    // 1) Detect GLOBAL QR (posters): just set mode and ask for code entry
    const globalMode = decodeGlobalModeFromQr(text);
    if (globalMode) {
      setMode(globalMode);
      setAwaitingCode(true);
      setCode("");
      const human = globalMode === "IN" ? "Entrada" : "Salida";
      setBanner({ variant: "success", message: `${human} seleccionado. Ingresa el código y presiona Registrar.` });
      beep(660, 120, "sine");
      vibrate(40);
      setCooldownUntil(Date.now() + 1500);
      processingRef.current = false;
      return;
    }

    const payload = decodePersonPayloadFromQr(text);
    if (!payload) {
      setBanner({ variant: "error", message: "QR inválido (INVALID_QR)" });
      beep(220, 150, "square");
      vibrate(120);
      setCooldownUntil(Date.now() + 800);
      processingRef.current = false;
      return;
    }

    const deviceId = ensureDeviceId();
    try {
      const res = await fetch("/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, type: mode, deviceId }),
      });
      const json: (ScanOk & { alerts?: string[]; lastSameAt?: string; alreadyMarkedAt?: string }) | ScanErr = await res.json();
      if ((json as ScanOk).ok) {
        const ok = json as ScanOk & { alerts?: string[]; lastSameAt?: string; alreadyMarkedAt?: string };
        setOverlay({ person: ok.person });
        const human = mode === "IN" ? "Entrada registrada" : "Salida registrada";
        const already = ok.alerts?.includes('already_marked');
        const sameDir = ok.alerts?.includes('same_direction');
        const extraAlready = already ? ` · Ya estaba registrada hoy${ok.alreadyMarkedAt ? ` (${new Date(ok.alreadyMarkedAt).toLocaleTimeString()})` : ''}` : '';
        const extraSame = !already && sameDir ? ` · Nota: misma dirección que tu última marca${ok.lastSameAt ? ` (${new Date(ok.lastSameAt).toLocaleTimeString()})` : ''}` : '';
        setBanner({ variant: "success", message: `${human}: ${ok.person.name} (${ok.person.code})${extraAlready}${extraSame}` });
        beep(880, 120, "sine");
        vibrate(60);
        setCooldownUntil(Date.now() + 1200);
      } else {
        const err = json as ScanErr;
        // Map backend codes to UX messages
        let msg = err.code;
        if (
          err.code === "INVALID_SIGNATURE" ||
          err.code === "INVALID_VERSION" ||
          err.code === "STALE" ||
          err.code === "FUTURE_TS" ||
          err.code === "INVALID_TS"
        ) {
          msg = "INVALID_QR";
        }
        if (err.code === "DUPLICATE") msg = "REPLAY"; // align with UX wording

        if (err.person) setOverlay({ person: err.person, lastScanAt: err.lastScanAt });

        let human = "Error";
        if (msg === "INVALID_QR") human = "QR inválido";
        else if (msg === "REPLAY") human = `Duplicado. Último: ${err.lastScanAt ? new Date(err.lastScanAt).toLocaleTimeString() : "hace <10s"}`;
        else if (msg === "PERSON_INACTIVE") human = "Persona inactiva";
        else if (err.code === "RATE_LIMIT") human = "Límite de velocidad alcanzado";
        else human = msg;

        setBanner({ variant: "error", message: human });
        beep(220, 150, "square");
        vibrate(120);
        setCooldownUntil(Date.now() + 1000);
      }
    } catch (e: any) {
      setBanner({ variant: "error", message: `Fallo de red: ${String(e?.message || e)}` });
      beep(220, 150, "square");
      vibrate(120);
      setCooldownUntil(Date.now() + 1000);
    } finally {
      processingRef.current = false;
    }
  }, [inCooldown, mode, awaitingCode]);

  const handleResult = useCallback((result: Result) => {
    if (!result) return;
    processDecodedText(result.getText());
  }, [processDecodedText]);

  const onFileSelect = useCallback(async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      try {
        const r: any = await (readerRef.current as any)?.decodeFromImageUrl?.(dataUrl);
        const text: string | undefined = r?.getText?.();
        if (text) {
          await processDecodedText(text);
        } else {
          setBanner({ variant: "error", message: "No se pudo leer el QR de la imagen" });
        }
      } catch (e) {
        setBanner({ variant: "error", message: "No se pudo leer el QR de la imagen" });
      }
    };
    reader.readAsDataURL(file);
  }, [processDecodedText]);

  const submitCode = useCallback(async () => {
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) return;
    const deviceId = ensureDeviceId();
    try {
      const res = await fetch("/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized, type: mode, deviceId }),
      });
      const json: (ScanOk & { alerts?: string[]; lastSameAt?: string; alreadyMarkedAt?: string }) | ScanErr = await res.json();
      if ((json as ScanOk).ok) {
        const ok = json as ScanOk & { alerts?: string[]; lastSameAt?: string; alreadyMarkedAt?: string };
        if (ok.person) setOverlay({ person: ok.person });
        const human = mode === "IN" ? "Entrada registrada" : "Salida registrada";
        const who = ok.person ? `: ${ok.person.name} (${ok.person.code})` : "";
        const already = ok.alerts?.includes('already_marked');
        const sameDir = ok.alerts?.includes('same_direction');
        const extraAlready = already ? ` · Ya estaba registrada hoy${ok.alreadyMarkedAt ? ` (${new Date(ok.alreadyMarkedAt).toLocaleTimeString()})` : ''}` : '';
        const extraSame = !already && sameDir ? ` · Nota: misma dirección que la última marca${ok.lastSameAt ? ` (${new Date(ok.lastSameAt).toLocaleTimeString()})` : ''}` : '';
        setBanner({ variant: "success", message: `${human}${who}${extraAlready}${extraSame}` });
        beep(880, 120, "sine");
        vibrate(60);
        setAwaitingCode(false);
        setCode("");
        setCooldownUntil(Date.now() + 800);
      } else {
        const err = json as ScanErr;
        let msg = err.code;
        if (err.code === "DUPLICATE") msg = "REPLAY";
        let human = "Error";
        if (msg === "REPLAY") human = `Duplicado. Último: ${err.lastScanAt ? new Date(err.lastScanAt).toLocaleTimeString() : "hace <10s"}`;
        else if (msg === "PERSON_INACTIVE") human = "Persona inactiva";
        else if (err.code === "RATE_LIMIT") human = "Límite de velocidad alcanzado";
        else if (err.code === "BAD_REQUEST") human = "Formato no soportado (pendiente backend)";
        else human = msg;
        setBanner({ variant: "error", message: human });
        beep(220, 150, "square");
        vibrate(120);
      }
    } catch (e: any) {
      setBanner({ variant: "error", message: `Fallo de red: ${String(e?.message || e)}` });
      beep(220, 150, "square");
      vibrate(120);
    }
  }, [code, mode]);

  useEffect(() => {
    let mounted = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const videoEl = videoRef.current;
    const constraints = { video: { facingMode: "environment" as const } };

    reader
      .decodeFromConstraints(constraints, videoEl!, (result: Result | null, _err: unknown) => {
        if (result) handleResult(result);
        // Ignorar errores frecuentes de decodificación; la librería llama continuamente
      })
      .catch((e: unknown) => {
        const msg = typeof e === 'object' && e && 'toString' in e ? (e as any).toString() : String(e);
        setCameraError(msg || "Permiso denegado o cámara no disponible");
        setBanner({ variant: "error", message: `No se pudo abrir la cámara: ${msg}` });
      });

    return () => {
      mounted = false;
      try {
        readerRef.current?.reset();
      } catch {}
      // Detener el stream si existe
      try {
        const s = videoRef.current?.srcObject as MediaStream | undefined;
        s?.getTracks().forEach((t) => t.stop());
      } catch {}
    };
  }, [handleResult]);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Scanner</h1>
      {banner && (
        <div className={`mb-4 text-sm ${banner.variant === 'success' ? 'alert-success' : 'alert-danger'}`}>{banner.message}</div>
      )}

      {/* Panel para ingresar código cuando se escanea un QR GLOBAL (póster) */}
      {awaitingCode && (
        <div className="mb-4 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 text-sm text-soft">
            Modo: <span className={mode === "IN" ? "text-success" : "text-warning"}>{mode === "IN" ? "Entrada" : "Salida"}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Código de persona"
              className="input max-w-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitCode();
                }
              }}
            />
            <button
              className="btn"
              disabled={code.trim().toUpperCase().length < 4}
              onClick={submitCode}
            >
              Registrar
            </button>
            <button
              className="btn-outline"
              onClick={() => {
                setAwaitingCode(false);
                setCode("");
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="relative mx-auto w-full max-w-sm sm:max-w-2xl aspect-square sm:aspect-video overflow-hidden rounded-lg border border-gray-200 bg-black shadow-sm">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />

        {/* Guías de encuadre (solo si no hay overlay de resultado ni error) */}
        {!overlay && !cameraError && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-success"></div>
            <div className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-success"></div>
            <div className="absolute left-4 bottom-4 h-6 w-6 border-l-2 border-b-2 border-success"></div>
            <div className="absolute right-4 bottom-4 h-6 w-6 border-r-2 border-b-2 border-success"></div>
          </div>
        )}

        {overlay && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 text-white">
            <div>
              <div className="text-lg font-semibold leading-tight">{overlay.person.name}</div>
              <div className="text-xs opacity-90">{overlay.person.code}</div>
            </div>
            {overlay.lastScanAt && (
              <div className="text-right text-xs opacity-90">
                Último: {new Date(overlay.lastScanAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4 text-center text-white">
            <div>
              <p className="mb-2 font-medium">No se pudo acceder a la cámara</p>
              <p className="text-sm opacity-90">
                Concede permiso de cámara al navegador o sube una imagen del QR.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <p className="text-sm text-soft">
          Consejo: acércate al QR y mantén la cámara estable. Si el navegador te pide permiso de cámara,
          acepta para poder escanear. En caso de problemas, puedes subir una foto del QR.
        </p>
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 active:shadow">
          Subir imagen del QR
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
          />
        </label>
        {cameraError && (
          <button
            className="w-fit rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
            onClick={() => {
              // intentar reintentar cámara (re-montar lógica)
              setCameraError(null);
              readerRef.current?.reset();
              // parar media stream si existe
              const v = videoRef.current;
              if (v) {
                try {
                  const s = v.srcObject as MediaStream | undefined;
                  s?.getTracks().forEach((t) => t.stop());
                } catch {}
              }
              // disparar nuevamente el efecto cambiando cooldown (trigger render)
              setCooldownUntil((c) => c);
            }}
          >
            Reintentar cámara
          </button>
        )}
      </div>
    </div>
  );
}
