"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { verifyBirthdayClaim, type BirthdayClaim } from "@/lib/birthdays/token";
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
          // Hide overlay after 10 seconds for offers (longer than person overlays)
          if (overlayHideTimeout) clearTimeout(overlayHideTimeout);
          setOverlayHideTimeout(setTimeout(() => setOfferOverlay(null), 10000));
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
          // Redirect to staff birthday interface
          window.location.href = `/u/birthdays/${encodeURIComponent(birthdayClaim.rid)}`;
        } else {
          // Redirect to public birthday interface
          window.location.href = `/marketing/birthdays/${encodeURIComponent(birthdayClaim.rid)}/qrs`;
        }

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
          // Redirect to birthday page
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

    // 3.6) Detect STATIC TOKEN URL: redirect to static token page
    // More flexible detection for static tokens
    const staticTokenRegex = /(?:^|\/)static\/([^\/\s]{4,})/i;
    const staticMatch = text.match(staticTokenRegex);
    if (staticMatch) {
      const tokenId = staticMatch[1];
      console.log('Staff scanner detected static token, ID:', tokenId, 'from text:', text);
      setBanner({ variant: "success", message: `🎫 Token estático detectado - Redirigiendo...` });
      beep(880, 120, "sine");
      vibrate(60);
      setCooldownUntil(Date.now() + 2000);
      // Redirect to static token page
      window.location.href = `/static/${tokenId}`;
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

    // 4) Process PERSON QR: scan attendance

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
        // Hide overlay after 3 seconds
        if (overlayHideTimeout) clearTimeout(overlayHideTimeout);
        setOverlayHideTimeout(setTimeout(() => setOverlay(null), 3000));
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
    return () => {
      if (overlayHideTimeout) {
        clearTimeout(overlayHideTimeout);
      }
    };
  }, [overlayHideTimeout]);

  useEffect(() => {
    let mounted = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const videoEl = videoRef.current;
    const constraints = { video: { facingMode: "environment" as const } };

    reader
      .decodeFromConstraints(constraints, videoEl!, (result: Result | null, _err: unknown) => {
        if (!mounted) return; // Component was unmounted
        if (result) {
          processDecodedText(result.getText());
        }
        // Ignorar errores frecuentes de decodificación; la librería llama continuamente
      })
      .catch((e: unknown) => {
        if (!mounted) return; // Component was unmounted
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
  }, [processDecodedText]);

  return (
    <div className="min-h-screen w-full bg-[var(--color-bg)] px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto rounded-2xl shadow-2xl bg-white dark:bg-slate-800 p-4 sm:p-5 md:p-6 flex flex-col justify-start min-h-[85vh] sm:min-h-[75vh] md:min-h-[70vh]">
        <h1 className="mb-2 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight text-center drop-shadow">Escáner de Códigos</h1>
        <p className="mb-4 sm:mb-5 text-sm sm:text-base text-gray-700 dark:text-slate-300 text-center font-medium px-2">Escanea códigos QR de invitaciones, tokens y ofertas especiales.</p>

        {banner && (
          <div className={`mb-3 sm:mb-4 w-full text-center text-sm sm:text-base font-semibold rounded-lg px-3 sm:px-4 py-2 sm:py-3 ${banner.variant === 'success' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'}`}>{banner.message}</div>
        )}

        {awaitingCode && (
          <div className="mb-3 sm:mb-4 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4 shadow flex flex-col items-center">
            <div className="mb-3 sm:mb-4 text-sm sm:text-base text-gray-700 dark:text-slate-300 font-semibold text-center">
              Modo: <span className={mode === "IN" ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>{mode === "IN" ? "Entrada" : "Salida"}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Código de persona"
                className="input w-full sm:max-w-xs text-base sm:text-lg font-bold text-center border-gray-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-400 dark:bg-slate-700 dark:text-slate-100 px-3 py-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCode();
                  }
                }}
              />
              <div className="flex gap-2 w-full sm:w-auto justify-center">
                <button
                  className="btn bg-blue-600 text-white font-bold px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex-1 sm:flex-none"
                  disabled={code.trim().toUpperCase().length < 4}
                  onClick={submitCode}
                >
                  Registrar
                </button>
                <button
                  className="btn-outline border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 flex-1 sm:flex-none"
                  onClick={() => {
                    setAwaitingCode(false);
                    setCode("");
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg aspect-square sm:aspect-video overflow-hidden rounded-2xl border-2 border-gray-300 dark:border-slate-600 bg-black shadow-lg mx-auto">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />

          {/* Guías de encuadre (solo si no hay overlay de resultado ni error) */}
          {!overlay && !cameraError && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-3 sm:left-4 top-3 sm:top-4 h-6 w-6 sm:h-8 sm:w-8 border-l-3 sm:border-l-4 border-t-3 sm:border-t-4 border-blue-400 rounded-tl-xl"></div>
              <div className="absolute right-3 sm:right-4 top-3 sm:top-4 h-6 w-6 sm:h-8 sm:w-8 border-r-3 sm:border-r-4 border-t-3 sm:border-t-4 border-blue-400 rounded-tr-xl"></div>
              <div className="absolute left-3 sm:left-4 bottom-3 sm:bottom-4 h-6 w-6 sm:h-8 sm:w-8 border-l-3 sm:border-l-4 border-b-3 sm:border-b-4 border-blue-400 rounded-bl-xl"></div>
              <div className="absolute right-3 sm:right-4 bottom-3 sm:bottom-4 h-6 w-6 sm:h-8 sm:w-8 border-r-3 sm:border-r-4 border-b-3 sm:border-b-4 border-blue-400 rounded-br-xl"></div>
            </div>
          )}

          {overlay && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent pb-3 sm:pb-4 px-3 sm:px-4 pt-3 sm:pt-4 text-white rounded-2xl">
              <div className="min-w-0 flex-1">
                <div className="text-lg sm:text-xl font-bold leading-tight drop-shadow-lg truncate">{overlay.person.name}</div>
                <div className="text-sm sm:text-base opacity-90 font-mono truncate">{overlay.person.code}</div>
              </div>
              {overlay.lastScanAt && (
                <div className="text-right text-xs sm:text-sm opacity-90 ml-2 flex-shrink-0">
                  Último: {new Date(overlay.lastScanAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {offerOverlay && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-green-900/90 via-green-800/50 to-transparent pb-3 sm:pb-4 px-3 sm:px-4 pt-3 sm:pt-4 text-white rounded-2xl">
              <div className="text-center max-w-full">
                <div className="text-base sm:text-lg font-bold leading-tight drop-shadow-lg mb-1 sm:mb-2">
                  🎁 {offerOverlay.offer.title}
                </div>
                <div className="text-sm sm:text-base opacity-90 truncate">
                  {offerOverlay.purchase.customerName}
                </div>
                <div className="text-xs sm:text-sm opacity-80">
                  S/ {offerOverlay.purchase.amount.toFixed(2)}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(offerOverlay.purchase.createdAt).toLocaleDateString()}
                </div>
                {offerOverlay.canComplete && (
                  <button
                    className="pointer-events-auto mt-3 px-3 sm:px-4 py-2 bg-white text-green-800 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors text-sm sm:text-base"
                    onClick={async () => {
                      if (!offerOverlay.purchaseId) return;

                      try {
                        const res = await fetch('/api/offers/complete-delivery', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
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
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-3 sm:p-4 text-center text-white rounded-2xl">
              <div className="max-w-full">
                <p className="mb-2 font-bold text-base sm:text-lg">No se pudo acceder a la cámara</p>
                <p className="text-sm sm:text-base opacity-90 px-2">
                  Concede permiso de cámara al navegador o sube una imagen del QR.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 sm:mt-6 flex flex-col gap-3 sm:gap-4 w-full items-center">
          <label className="inline-flex w-full sm:w-fit cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 dark:text-slate-300 shadow hover:bg-gray-50 dark:hover:bg-slate-600 active:shadow transition-colors">
            📷 Subir imagen
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
            />
          </label>
          {cameraError && (
            <button
              className="w-full sm:w-fit rounded-xl border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 dark:text-slate-300 shadow hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
              onClick={() => {
                setCameraError(null);
                readerRef.current?.reset();
                const v = videoRef.current;
                if (v) {
                  try {
                    const s = v.srcObject as MediaStream | undefined;
                    s?.getTracks().forEach((t) => t.stop());
                  } catch {}
                }
                setCooldownUntil((c) => c);
              }}
            >
              🔄 Reintentar cámara
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
