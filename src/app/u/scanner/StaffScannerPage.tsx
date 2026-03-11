"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { verifyBirthdayClaim, type BirthdayClaim } from "@/lib/birthdays/token";
import {
  IconArrowLeft,
  IconCamera,
  IconCameraOff,
  IconHistory,
  IconLogin,
  IconLogout,
  IconPhoto,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
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

type ScanHistoryEntry = {
  id: string;
  ts: number;
  type: "person" | "offer" | "birthday" | "invitation" | "reusable" | "global" | "error";
  label: string;
  detail?: string;
  variant: "success" | "error" | "info";
};

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

function decodeOfferQrFromText(text: string): { type: string; purchaseId: string; qrCode: string } | null {
  // Try JSON direct
  try {
    const j = JSON.parse(text);
    if (j && typeof j === "object" && j.type === "offer_purchase" && j.purchaseId && j.qrCode) {
      return j as { type: string; purchaseId: string; qrCode: string };
    }
  } catch {}
  return null;
}

function decodeBirthdayQrFromText(text: string): BirthdayClaim | null {
  // Try JSON direct - birthday tokens are SignedBirthdayToken objects
  try {
    const j = JSON.parse(text);
    if (j && typeof j === "object" && j.payload && j.sig) {
      const token = j as { payload: BirthdayClaim; sig: string };
      const verification = verifyBirthdayClaim(token);
      if (verification.ok) {
        return verification.payload;
      }
    }
  } catch {}
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

export default function StaffScannerPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const processingRef = useRef(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);

  const [banner, setBanner] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [overlay, setOverlay] = useState<{ person: Person; lastScanAt?: string } | null>(null);
  const [offerOverlay, setOfferOverlay] = useState<{
    purchase: { customerName: string; amount: number; createdAt: string };
    offer: { title: string; price: number };
    status: string;
    purchaseId?: string;
    canComplete?: boolean;
  } | null>(null);
  const [overlayHideTimeout, setOverlayHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const [mode, setMode] = useState<Mode>("IN");
  const [awaitingCode, setAwaitingCode] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [scanCount, setScanCount] = useState({ total: 0, success: 0, error: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const inCooldown = useMemo(() => Date.now() < cooldownUntil, [cooldownUntil]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("staffScanHistory");
      if (stored) {
        const parsed = JSON.parse(stored) as ScanHistoryEntry[];
        if (Array.isArray(parsed)) {
          setScanHistory(parsed.slice(0, 50));
          const s = parsed.reduce((a, e) => ({ total: a.total + 1, success: a.success + (e.variant === "success" ? 1 : 0), error: a.error + (e.variant === "error" ? 1 : 0) }), { total: 0, success: 0, error: 0 });
          setScanCount(s);
        }
      }
    } catch {}
  }, []);

  const addHistory = useCallback((entry: Omit<ScanHistoryEntry, "id" | "ts">) => {
    const newEntry: ScanHistoryEntry = { ...entry, id: crypto.randomUUID(), ts: Date.now() };
    setScanHistory((prev) => {
      const next = [newEntry, ...prev].slice(0, 50);
      try { localStorage.setItem("staffScanHistory", JSON.stringify(next)); } catch {}
      return next;
    });
    setScanCount((prev) => ({
      total: prev.total + 1,
      success: prev.success + (entry.variant === "success" ? 1 : 0),
      error: prev.error + (entry.variant === "error" ? 1 : 0),
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setScanHistory([]);
    setScanCount({ total: 0, success: 0, error: 0 });
    try { localStorage.removeItem("staffScanHistory"); } catch {}
  }, []);

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
      addHistory({ type: "global", label: `Modo ${human}`, variant: "info" });
      setBanner({ variant: "success", message: `${human} seleccionado. Ingresa el código y presiona Registrar.` });
      beep(660, 120, "sine");
      vibrate(40);
      setCooldownUntil(Date.now() + 1500);
      processingRef.current = false;
      return;
    }

    // 2) Detect OFFER QR: validate offer purchase
    const offerQrData = decodeOfferQrFromText(text);
    if (offerQrData) {
      try {
        const res = await fetch("/api/offers/validate-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrData: text }),
        });
        const json = await res.json();

        if (json.valid) {
          setOfferOverlay({
            purchase: {
              customerName: json.purchase.customerName,
              amount: json.purchase.amount,
              createdAt: json.purchase.createdAt
            },
            offer: {
              title: json.offer.title,
              price: json.offer.price
            },
            status: json.status,
            purchaseId: json.purchase.purchaseId,
            canComplete: json.purchase.status === 'PENDING'
          });
          if (overlayHideTimeout) clearTimeout(overlayHideTimeout);
          setOverlayHideTimeout(setTimeout(() => setOfferOverlay(null), 10000));
          addHistory({ type: "offer", label: `Oferta: ${json.offer.title}`, detail: json.purchase.customerName, variant: "success" });
          setBanner({ variant: "success", message: `✅ Oferta pendiente: ${json.purchase.customerName} - S/ ${json.purchase.amount.toFixed(2)}` });
          beep(880, 120, "sine");
          vibrate(60);
          setCooldownUntil(Date.now() + 1200);
        } else {
          let errorMsg = "QR de oferta inválido";
          if (json.status === 'expired') errorMsg = "QR de oferta expirado";
          else if (json.status === 'used') errorMsg = "QR de oferta ya utilizado";
          else if (json.status === 'cancelled') errorMsg = "Compra de oferta cancelada";
          else if (json.status === 'refunded') errorMsg = "Compra de oferta reembolsada";

          addHistory({ type: "offer", label: errorMsg, variant: "error" });

          setBanner({ variant: "error", message: errorMsg });
          beep(220, 150, "square");
          vibrate(120);
          setCooldownUntil(Date.now() + 1000);
        }
      } catch (e: any) {
        setBanner({ variant: "error", message: `Error al validar oferta: ${String(e?.message || e)}` });
        beep(220, 150, "square");
        vibrate(120);
        setCooldownUntil(Date.now() + 1000);
      }
      processingRef.current = false;
      return;
    }

    // 3) Detect BIRTHDAY QR: redirect to appropriate birthday interface
    const birthdayClaim = decodeBirthdayQrFromText(text);
    if (birthdayClaim) {
      try {
        // Check if user has valid session (admin/staff or collaborator)
        const sessionRes = await fetch("/api/static/session");
        const sessionJson = await sessionRes.json();
        const hasValidSession = sessionJson.isStaff || sessionJson.isAdmin || sessionJson.isCollaborator;

        if (hasValidSession) {
          window.location.href = `/u/birthdays/${encodeURIComponent(birthdayClaim.rid)}`;
        } else {
          window.location.href = `/marketing/birthdays/${encodeURIComponent(birthdayClaim.rid)}/qrs`;
        }

        addHistory({ type: "birthday", label: "Token de cumpleaños", detail: birthdayClaim.rid, variant: "success" });

        setBanner({ variant: "success", message: `🎂 Token de cumpleaños detectado - Redirigiendo...` });
        beep(880, 120, "sine");
        vibrate(60);
        setCooldownUntil(Date.now() + 2000);
      } catch (e: any) {
        setBanner({ variant: "error", message: `Error al procesar token de cumpleaños: ${String(e?.message || e)}` });
        beep(220, 150, "square");
        vibrate(120);
        setCooldownUntil(Date.now() + 1000);
      }
      processingRef.current = false;
      return;
    }

    // 3.5) Detect BIRTHDAY URL: redirect to birthday page
    try {
      const url = new URL(text);
      if (url.pathname.startsWith('/b/')) {
        // Extract code from URL
        const code = url.pathname.split('/b/')[1];
        if (code && code.length >= 4) {
          addHistory({ type: "birthday", label: "Código de cumpleaños", detail: code, variant: "info" });
          window.location.href = url.pathname + url.search + url.hash;
          setBanner({ variant: "success", message: `🎂 Código de cumpleaños detectado - Redirigiendo...` });
          beep(880, 120, "sine");
          vibrate(60);
          setCooldownUntil(Date.now() + 2000);
          processingRef.current = false;
          return;
        }
      }
    } catch {
      // Not a URL, continue with normal processing
    }

    // 3.7) Detect REUSABLE TOKEN URL: redirect to reusable token page
    try {
      const url = new URL(text);
      if (url.pathname.startsWith('/reusable/')) {
        // Extract tokenId from URL
        const tokenId = url.pathname.split('/reusable/')[1];
        if (tokenId) {
          addHistory({ type: "reusable", label: "Token reutilizable", detail: tokenId, variant: "info" });
          setBanner({ variant: "success", message: `🎫 Token reutilizable detectado - Redirigiendo...` });
          beep(880, 120, "sine");
          vibrate(60);
          setCooldownUntil(Date.now() + 2000);
          // Redirect to reusable token page
          window.location.href = `/reusable/${tokenId}`;
          processingRef.current = false;
          return;
        }
      }
    } catch {
      // Not a URL, continue with normal processing
    }

    // 3.8) Detect INVITATION URL: redirect to invitation validation page
    try {
      const url = new URL(text);
      if (url.pathname.startsWith('/i/')) {
        const invCode = url.pathname.split('/i/')[1];
        if (invCode && invCode.length >= 4) {
          addHistory({ type: "invitation", label: "Invitación detectada", detail: invCode, variant: "info" });
          setBanner({ variant: "success", message: `🎟️ Invitación detectada - Redirigiendo...` });
          beep(880, 120, "sine");
          vibrate(60);
          setCooldownUntil(Date.now() + 2000);
          window.location.href = url.pathname + url.search + url.hash;
          processingRef.current = false;
          return;
        }
      }
    } catch {
      // Not a URL, continue with normal processing
    }

    const payload = decodePersonPayloadFromQr(text);
    if (!payload) {
      addHistory({ type: "error", label: "QR inválido", variant: "error" });
      setBanner({ variant: "error", message: "QR inválido (INVALID_QR)" });
      beep(220, 150, "square");
      vibrate(120);
      setCooldownUntil(Date.now() + 800);
      processingRef.current = false;
      return;
    }

    // 4) Process PERSON QR: scan attendance

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
        if (overlayHideTimeout) clearTimeout(overlayHideTimeout);
        setOverlayHideTimeout(setTimeout(() => setOverlay(null), 3000));
        const human = mode === "IN" ? "Entrada registrada" : "Salida registrada";
        const already = ok.alerts?.includes('already_marked');
        const sameDir = ok.alerts?.includes('same_direction');
        const extraAlready = already ? ` · Ya estaba registrada hoy${ok.alreadyMarkedAt ? ` (${new Date(ok.alreadyMarkedAt).toLocaleTimeString()})` : ''}` : '';
        const extraSame = !already && sameDir ? ` · Nota: misma dirección que tu última marca${ok.lastSameAt ? ` (${new Date(ok.lastSameAt).toLocaleTimeString()})` : ''}` : '';
        addHistory({ type: "person", label: `${human}: ${ok.person.name}`, detail: ok.person.code, variant: "success" });
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

        addHistory({ type: "person", label: human, detail: err.person?.code, variant: "error" });

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
  }, [inCooldown, mode, awaitingCode, addHistory]);

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
    return () => {
      if (overlayHideTimeout) {
        clearTimeout(overlayHideTimeout);
      }
    };
  }, [overlayHideTimeout]);

  useEffect(() => {
    if (!cameraActive) return;
    let mounted = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const videoEl = videoRef.current;
    const constraints = { video: { facingMode: "environment" as const } };

    reader
      .decodeFromConstraints(constraints, videoEl!, (result: Result | null, _err: unknown) => {
        if (!mounted) return;
        if (result) {
          processDecodedText(result.getText());
        }
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        const msg = typeof e === 'object' && e && 'toString' in e ? (e as any).toString() : String(e);
        setCameraError(msg || "Permiso denegado o cámara no disponible");
        setBanner({ variant: "error", message: `No se pudo abrir la cámara: ${msg}` });
      });

    return () => {
      mounted = false;
      try {
        readerRef.current?.reset();
      } catch {}
      try {
        const s = videoRef.current?.srcObject as MediaStream | undefined;
        s?.getTracks().forEach((t) => t.stop());
      } catch {}
    };
  }, [processDecodedText, cameraActive]);

  const toggleCamera = useCallback(() => {
    if (cameraActive) {
      // Stop camera
      try { readerRef.current?.reset(); } catch {}
      try {
        const s = videoRef.current?.srcObject as MediaStream | undefined;
        s?.getTracks().forEach((t) => t.stop());
      } catch {}
    }
    setCameraError(null);
    setCameraActive((p) => !p);
  }, [cameraActive]);

  const retryCamera = useCallback(() => {
    setCameraError(null);
    setCameraActive(false);
    setTimeout(() => setCameraActive(true), 100);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[var(--color-bg)] px-3 py-3 sm:px-4 sm:py-5 md:px-6 md:py-6">
      {/* Header bar */}
      <div className="w-full max-w-2xl mx-auto mb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
          >
            <IconArrowLeft size={18} />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            Escáner Staff
          </h1>
          <button
            onClick={() => setShowHistory((p) => !p)}
            className={`relative flex items-center gap-1 text-sm px-2 py-1 rounded-lg transition-colors ${showHistory ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"}`}
          >
            <IconHistory size={18} />
            {scanCount.total > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-teal-500 text-white rounded-full px-1">
                {scanCount.total}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto flex flex-col lg:flex-row gap-3">
        {/* Main scanner column */}
        <div className="flex-1 min-w-0">
          {/* Mode toggle — always visible */}
          <div className="mb-3 flex items-center justify-center gap-1 rounded-xl bg-gray-100 dark:bg-slate-700/60 p-1">
            <button
              onClick={() => { setMode("IN"); setAwaitingCode(false); setCode(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${mode === "IN" ? "bg-green-500 text-white shadow" : "text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"}`}
            >
              <IconLogin size={16} />
              Entrada
            </button>
            <button
              onClick={() => { setMode("OUT"); setAwaitingCode(false); setCode(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${mode === "OUT" ? "bg-amber-500 text-white shadow" : "text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"}`}
            >
              <IconLogout size={16} />
              Salida
            </button>
          </div>

          {/* Banner */}
          {banner && (
            <div
              className={`mb-3 w-full text-center text-sm font-semibold rounded-lg px-3 py-2.5 flex items-center justify-between gap-2 ${
                banner.variant === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700"
              }`}
            >
              <span className="flex-1 text-left">{banner.message}</span>
              <button onClick={() => setBanner(null)} className="flex-shrink-0 opacity-60 hover:opacity-100">
                <IconX size={16} />
              </button>
            </div>
          )}

          {/* Code entry from GLOBAL QR */}
          {awaitingCode && (
            <div className="mb-3 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow">
              <div className="mb-2 text-sm text-gray-600 dark:text-slate-400 font-medium text-center">
                Ingresa código manualmente
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Código"
                  className="flex-1 text-center text-base font-bold rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 px-3 py-2 focus:border-teal-500 focus:ring-1 focus:ring-teal-400 outline-none"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitCode(); } }}
                />
                <button
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold text-sm shadow hover:bg-teal-700 disabled:opacity-40 transition-colors"
                  disabled={code.trim().length < 4}
                  onClick={submitCode}
                >
                  OK
                </button>
                <button
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => { setAwaitingCode(false); setCode(""); }}
                >
                  <IconX size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Camera viewport */}
          <div className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl border-2 border-gray-200 dark:border-slate-600 bg-black shadow-lg">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />

            {/* Scanning guides */}
            {!overlay && !offerOverlay && !cameraError && cameraActive && (
              <div className="pointer-events-none absolute inset-0">
                {/* Corner brackets */}
                <div className="absolute left-4 top-4 h-8 w-8 border-l-[3px] border-t-[3px] border-teal-400 rounded-tl-lg" />
                <div className="absolute right-4 top-4 h-8 w-8 border-r-[3px] border-t-[3px] border-teal-400 rounded-tr-lg" />
                <div className="absolute left-4 bottom-4 h-8 w-8 border-l-[3px] border-b-[3px] border-teal-400 rounded-bl-lg" />
                <div className="absolute right-4 bottom-4 h-8 w-8 border-r-[3px] border-b-[3px] border-teal-400 rounded-br-lg" />
                {/* Scan line animation */}
                <div className="absolute left-6 right-6 top-1/2 h-0.5 bg-teal-400/50 animate-pulse" />
                {/* Mode badge */}
                <div className={`absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${mode === "IN" ? "bg-green-500/80 text-white" : "bg-amber-500/80 text-white"}`}>
                  {mode === "IN" ? "ENTRADA" : "SALIDA"}
                </div>
              </div>
            )}

            {/* Camera off state */}
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white">
                <IconCameraOff size={48} className="opacity-40 mb-3" />
                <p className="text-sm opacity-60">Cámara pausada</p>
              </div>
            )}

            {/* Person overlay */}
            {overlay && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent pb-4 px-4 pt-4 text-white rounded-2xl">
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold leading-tight drop-shadow-lg truncate">{overlay.person.name}</div>
                  <div className="text-sm opacity-90 font-mono truncate">{overlay.person.code}</div>
                </div>
                {overlay.lastScanAt && (
                  <div className="text-right text-xs opacity-90 ml-2 flex-shrink-0">
                    Último: {new Date(overlay.lastScanAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}

            {/* Offer overlay */}
            {offerOverlay && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-green-900/90 via-green-800/50 to-transparent pb-4 px-4 pt-4 text-white rounded-2xl">
                <div className="text-center max-w-full">
                  <div className="text-base font-bold leading-tight drop-shadow-lg mb-1">
                    🎁 {offerOverlay.offer.title}
                  </div>
                  <div className="text-sm opacity-90 truncate">{offerOverlay.purchase.customerName}</div>
                  <div className="text-xs opacity-80">S/ {offerOverlay.purchase.amount.toFixed(2)}</div>
                  <div className="text-xs opacity-70 mt-1">{new Date(offerOverlay.purchase.createdAt).toLocaleDateString()}</div>
                  {offerOverlay.canComplete && (
                    <button
                      className="pointer-events-auto mt-3 px-4 py-2 bg-white text-green-800 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors text-sm"
                      onClick={async () => {
                        if (!offerOverlay.purchaseId) return;
                        try {
                          const res = await fetch("/api/offers/complete-delivery", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ purchaseId: offerOverlay.purchaseId }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setBanner({ variant: "success", message: "✅ Entrega completada exitosamente" });
                            setOfferOverlay(null);
                            beep(880, 120, "sine");
                            vibrate(60);
                          } else {
                            setBanner({ variant: "error", message: `Error: ${data.error}` });
                            beep(220, 150, "square");
                            vibrate(120);
                          }
                        } catch (e: any) {
                          setBanner({ variant: "error", message: `Error al completar entrega: ${String(e?.message || e)}` });
                          beep(220, 150, "square");
                          vibrate(120);
                        }
                      }}
                    >
                      Completar Entrega
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Camera error */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center text-white rounded-2xl">
                <IconCameraOff size={40} className="opacity-50 mb-3" />
                <p className="mb-1 font-bold text-sm">No se pudo acceder a la cámara</p>
                <p className="text-xs opacity-80 mb-3">Concede permiso de cámara al navegador.</p>
                <button onClick={retryCamera} className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                  <IconRefresh size={16} /> Reintentar
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={toggleCamera}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                cameraActive
                  ? "border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                  : "border-teal-300 dark:border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30"
              }`}
            >
              {cameraActive ? <><IconCameraOff size={16} /> Pausar</> : <><IconCamera size={16} /> Activar</>}
            </button>
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
              <IconPhoto size={16} />
              Imagen
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
              />
            </label>
            <div className="flex-1" />
            {/* Session stats */}
            <div className="flex items-center gap-2 text-xs">
              {scanCount.success > 0 && (
                <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">
                  ✓ {scanCount.success}
                </span>
              )}
              {scanCount.error > 0 && (
                <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold">
                  ✗ {scanCount.error}
                </span>
              )}
            </div>
          </div>

          {/* Supported QR types info */}
          <div className="mt-3 px-1">
            <div className="flex flex-wrap gap-1.5 justify-center text-[10px] font-medium text-gray-500 dark:text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">👤 Asistencia</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">🎁 Ofertas</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">🎂 Cumpleaños</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">🎟️ Invitaciones</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">🎫 Reutilizables</span>
            </div>
          </div>
        </div>

        {/* History panel — inline on lg, slide-up on mobile */}
        {showHistory && (
          <div className="w-full lg:w-72 lg:flex-shrink-0">
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-slate-700">
                <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">Historial</span>
                <div className="flex items-center gap-1">
                  {scanHistory.length > 0 && (
                    <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <IconTrash size={12} /> Limpiar
                    </button>
                  )}
                  <button onClick={() => setShowHistory(false)} className="lg:hidden p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                    <IconX size={16} />
                  </button>
                </div>
              </div>
              <div className="max-h-64 lg:max-h-[60vh] overflow-y-auto">
                {scanHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 dark:text-slate-500">
                    Sin escaneos aún
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {scanHistory.map((entry) => (
                      <div key={entry.id} className="px-3 py-2 flex items-start gap-2">
                        <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${entry.variant === "success" ? "bg-green-500" : entry.variant === "error" ? "bg-red-500" : "bg-blue-400"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{entry.label}</div>
                          {entry.detail && <div className="text-[10px] text-gray-500 dark:text-slate-500 truncate">{entry.detail}</div>}
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-slate-600 flex-shrink-0 tabular-nums">
                          {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
