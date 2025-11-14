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

export default function ScannerPage() {
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
    console.log('Admin scanner processDecodedText called with:', text);

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
        // Check if user is staff
        const sessionRes = await fetch("/api/static/session");
        const sessionJson = await sessionRes.json();
        const isStaff = sessionJson.isStaff || false;

        if (isStaff) {
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

    // 3.5) Detect STATIC TOKEN URL: redirect to static token page
    // More flexible detection for static tokens
    const staticTokenRegex = /(?:^|\/)static\/([^\/\s]{4,})/i;
    const staticMatch = text.match(staticTokenRegex);
    if (staticMatch) {
      const tokenId = staticMatch[1];
      console.log('Admin scanner detected static token, ID:', tokenId, 'from text:', text);
      setBanner({ variant: "success", message: `🎫 Token estático detectado - Redirigiendo...` });
      beep(880, 120, "sine");
      vibrate(60);
      setCooldownUntil(Date.now() + 2000);
      // Redirect to static token page
      window.location.href = `/static/${tokenId}`;
      processingRef.current = false;
      return;
    }
    
    try {
      const url = new URL(text);
      // Check for other URL patterns if needed
      console.log('Admin scanner parsed URL:', url.href, 'pathname:', url.pathname);
    } catch {
      // Not an absolute URL
      console.log('Admin scanner URL parsing failed for:', text);
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-yellow-300 px-2 py-8">
      <div className="w-full max-w-lg mx-auto rounded-2xl shadow-2xl bg-white/80 backdrop-blur-lg p-6 flex flex-col items-center">
        <h1 className="mb-2 text-3xl font-extrabold text-orange-700 tracking-tight text-center drop-shadow">Escáner QR</h1>
        <p className="mb-6 text-base text-orange-900 text-center font-medium">Escanea QR de personas, ofertas o usa pósters para registrar entrada/salida.</p>

        {banner && (
          <div className={`mb-4 w-full text-center text-base font-semibold rounded-lg px-4 py-2 ${banner.variant === 'success' ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>{banner.message}</div>
        )}

        {awaitingCode && (
          <div className="mb-4 w-full rounded-xl border border-orange-200 bg-white/90 p-4 shadow flex flex-col items-center">
            <div className="mb-2 text-base text-orange-700 font-semibold">
              Modo: <span className={mode === "IN" ? "text-green-600" : "text-yellow-600"}>{mode === "IN" ? "Entrada" : "Salida"}</span>
            </div>
            <div className="flex items-center gap-2 w-full justify-center">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Código de persona"
                className="input max-w-xs text-lg font-bold text-center border-orange-300 focus:border-orange-500 focus:ring-orange-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCode();
                  }
                }}
              />
              <button
                className="btn bg-orange-500 text-white font-bold px-4 py-2 rounded-lg shadow hover:bg-orange-600"
                disabled={code.trim().toUpperCase().length < 4}
                onClick={submitCode}
              >
                Registrar
              </button>
              <button
                className="btn-outline border-orange-300 text-orange-700 px-4 py-2 rounded-lg"
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

        <div className="relative mx-auto w-full max-w-xs sm:max-w-lg aspect-square sm:aspect-video overflow-hidden rounded-2xl border-2 border-orange-300 bg-black shadow-lg">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />

          {/* Guías de encuadre (solo si no hay overlay de resultado ni error) */}
          {!overlay && !cameraError && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-4 top-4 h-8 w-8 border-l-4 border-t-4 border-orange-400 rounded-tl-xl"></div>
              <div className="absolute right-4 top-4 h-8 w-8 border-r-4 border-t-4 border-orange-400 rounded-tr-xl"></div>
              <div className="absolute left-4 bottom-4 h-8 w-8 border-l-4 border-b-4 border-orange-400 rounded-bl-xl"></div>
              <div className="absolute right-4 bottom-4 h-8 w-8 border-r-4 border-b-4 border-orange-400 rounded-br-xl"></div>
            </div>
          )}

          {overlay && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 text-white rounded-2xl">
              <div>
                <div className="text-xl font-bold leading-tight drop-shadow-lg">{overlay.person.name}</div>
                <div className="text-base opacity-90 font-mono">{overlay.person.code}</div>
              </div>
              {overlay.lastScanAt && (
                <div className="text-right text-sm opacity-90">
                  Último: {new Date(overlay.lastScanAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {offerOverlay && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-green-900/90 via-green-800/50 to-transparent p-4 text-white rounded-2xl">
              <div className="text-center">
                <div className="text-lg font-bold leading-tight drop-shadow-lg mb-1">
                  🎁 {offerOverlay.offer.title}
                </div>
                <div className="text-base opacity-90">
                  {offerOverlay.purchase.customerName}
                </div>
                <div className="text-sm opacity-80">
                  S/ {offerOverlay.purchase.amount.toFixed(2)}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(offerOverlay.purchase.createdAt).toLocaleDateString()}
                </div>
                {offerOverlay.canComplete && (
                  <button
                    className="pointer-events-auto mt-3 px-4 py-2 bg-white text-green-800 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-white rounded-2xl">
              <div>
                <p className="mb-2 font-bold text-lg">No se pudo acceder a la cámara</p>
                <p className="text-base opacity-90">
                  Concede permiso de cámara al navegador o sube una imagen del QR.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4 w-full items-center">
          <p className="text-base text-orange-900 text-center font-medium">
            Consejo: acércate al QR y mantén la cámara estable. Si el navegador te pide permiso de cámara, acepta para poder escanear. En caso de problemas, puedes subir una foto del QR.
          </p>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border-2 border-orange-300 bg-white px-4 py-2 text-base font-semibold text-orange-700 shadow hover:bg-orange-50 active:shadow">
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
              className="w-fit rounded-xl border-2 border-orange-300 bg-white px-4 py-2 text-base font-semibold text-orange-700 shadow hover:bg-orange-50"
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
              Reintentar cámara
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
