'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { verifyBirthdayClaim, type BirthdayClaim } from '@/lib/birthdays/token';
import {
  IconArrowLeft,
  IconCamera,
  IconCameraOff,
  IconCopy,
  IconExternalLink,
  IconPhoto,
  IconQrcode,
  IconTrash,
  IconX,
} from '@tabler/icons-react';

interface ScanResult { 
  text: string; 
  ts: number; 
  type?: string;
  data?: any;
}

export default function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement|null>(null);
  const [active, setActive] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const lastNoticeTsRef = useRef<number>(0);
  const detectorRef = useRef<any>(null); // Native BarcodeDetector instance
  const zxingControlsRef = useRef<any>(null); // ZXing controls when using fallback
  const audioOkRef = useRef<HTMLAudioElement|null>(null);
  const flashRef = useRef<{ ts:number }|null>(null);
  const redirectedRef = useRef<boolean>(false); // evita múltiples redirecciones
  const [, force] = useState(0);
  const frameRef = useRef<number>();
  const resultsRef = useRef<ScanResult[]>([]);
  
  // Keep results in sync with ref
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('scanHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 100)); // Limit to 100
        }
      }
    } catch (e) {
      console.warn('Failed to load scan history:', e);
    }
  }, []);

  // Function to save history to localStorage
  const saveHistory = useCallback((newHistory: ScanResult[]) => {
    try {
      localStorage.setItem('scanHistory', JSON.stringify(newHistory.slice(0, 100)));
    } catch (e) {
      console.warn('Failed to save scan history:', e);
    }
  }, []);

  // Function to check if it's a global in/out code
  const isGlobalInOutCode = useCallback((raw: string): boolean => {
    if (!raw) return false; const text = String(raw).trim();
    // Direct JSON
    try {
      const j = JSON.parse(text);
      if (j && typeof j === 'object' && j.kind === 'GLOBAL' && (j.mode === 'IN' || j.mode === 'OUT')) return true;
    } catch {}
    // base64url JSON
    try {
      const pad = text.length % 4 === 2 ? '==' : text.length % 4 === 3 ? '=' : '';
      const b64 = text.replace(/-/g,'+').replace(/_/g,'/') + pad;
      const decoded = atob(b64);
      const j2 = JSON.parse(decoded);
      if (j2 && j2.kind === 'GLOBAL' && (j2.mode === 'IN' || j2.mode === 'OUT')) return true;
    } catch {}
    const upper = text.toUpperCase();
    if (upper === 'IN' || upper === 'OUT') return true;
    if (upper.startsWith('GLOBAL') && (upper.includes('IN') || upper.includes('OUT'))) return true;
    try {
      const url = new URL(text);
      const m = (url.searchParams.get('mode') || '').toUpperCase();
      if (m === 'IN' || m === 'OUT') return true;
    } catch {}
    return false;
  }, []);

  // Function to decode birthday QR tokens
  const decodeBirthdayQrFromText = useCallback((text: string): BirthdayClaim | null => {
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
  }, []);

  // Function to navigate to birthday pages
  const maybeNavigate = useCallback((raw: string): boolean => {
    if (redirectedRef.current) return false;
    
    // Detect reusable tokens: /reusable/rt_... or reusable/rt_... 
    const reusableTokenRegex = /(?:^|\/)reusable\/(rt_[A-Za-z0-9]+)/i;
    const reusableMatch = raw.match(reusableTokenRegex);
    if (reusableMatch) {
      const tokenId = reusableMatch[1];
      redirectedRef.current = true;
      setActive(false);
      setTimeout(()=>{ window.location.href = `/reusable/${tokenId}`; }, 120);
      return true;
    }
    
    // More flexible detection for static tokens
    const staticTokenRegex = /(?:^|\/)static\/([^\/\s]{4,})/i;
    const staticMatch = raw.match(staticTokenRegex);
    if (staticMatch) {
      const tokenId = staticMatch[1];
      redirectedRef.current = true;
      setActive(false); // detener cámara antes de salir
      // pequeña pausa para permitir sonido/flash visual
      setTimeout(()=>{ window.location.href = `/static/${tokenId}`; }, 120);
      return true;
    }
    
    try {
      const url = new URL(raw);
      // Patrón principal: /b/<code> (tanto relativo como absoluto)
      if (/^\/b\/[^/]{4,}$/.test(url.pathname)) {
        redirectedRef.current = true;
        setActive(false); // detener cámara antes de salir
        // pequeña pausa para permitir sonido/flash visual
        setTimeout(()=>{ window.location.href = url.pathname + url.search + url.hash; }, 120);
        return true;
      }
      // Patrón para invitaciones: /i/<code>
      if (/^\/i\/[^/]{4,}$/.test(url.pathname)) {
        redirectedRef.current = true;
        setActive(false); // detener cámara antes de salir
        // pequeña pausa para permitir sonido/flash visual
        setTimeout(()=>{ window.location.href = url.pathname + url.search + url.hash; }, 120);
        return true;
      }
      // Alternativos (por si en futuro los QR apuntan a marketing birthdays)
      if (/^\/marketing\/birthdays\//.test(url.pathname)) {
        redirectedRef.current = true;
        setActive(false);
        setTimeout(()=>{ window.location.href = url.pathname + url.search + url.hash; }, 120);
        return true;
      }
      // Para cualquier otra URL del mismo origen, redirigir
      if (url.origin === window.location.origin) {
        redirectedRef.current = true;
        setActive(false);
        setTimeout(()=>{ window.location.href = url.href; }, 120);
        return true;
      }
    } catch (e) {
      // no es URL absoluta; verificar si es ruta relativa
      if (/^\/b\/[^/]{4,}$/.test(raw)) {
        // Es una ruta relativa de cumpleaños
        redirectedRef.current = true;
        setActive(false); // detener cámara antes de salir
        // pequeña pausa para permitir sonido/flash visual
        setTimeout(()=>{ window.location.href = raw; }, 120);
        return true;
      }
      // Para cualquier otra ruta relativa, redirigir
      if (/^\//.test(raw)) {
        redirectedRef.current = true;
        setActive(false);
        setTimeout(()=>{ window.location.href = raw; }, 120);
        return true;
      }
      // no es URL absoluta; podría venir un code simple futuro: birthday:<code>
      if (/^https?:\/\//i.test(raw) === false && /^bday:/i.test(raw)) {
        // Formato hipotético bday:<code>
        const code = raw.split(':')[1];
        if (code && code.length >= 4 && !redirectedRef.current) {
          redirectedRef.current = true;
          setActive(false);
          setTimeout(()=>{ window.location.href = `/b/${encodeURIComponent(code)}`; }, 120);
          return true;
        }
      }
    }
    return false;
  }, []);

  // Function to process QR text (extracted for reuse)
  const processQrText = useCallback(async (raw: string) => {
    if (!raw) return;

    // First, check if it's a URL that should trigger navigation (static tokens, birthday codes, etc.)
    if (maybeNavigate(raw)) return;

    // Check if it's an offer QR
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.type === 'offer_purchase') {
        // It's an offer QR - redirect to validation page
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          setActive(false); // detener cámara antes de salir
          const isAdminContext = window.location.pathname.startsWith('/admin');
          const validationUrl = isAdminContext ? '/admin/offers/validate-qr' : '/validate-qr';
          sessionStorage.setItem('scannedQRData', raw);
          // pequeña pausa para permitir sonido/flash visual
          setTimeout(() => { window.location.href = validationUrl; }, 120);
        }
        return;
      }
    } catch {
      // Not a JSON QR, continue with normal processing
    }

    // Check if it's a birthday QR token
    const birthdayClaim = decodeBirthdayQrFromText(raw);
    if (birthdayClaim) {
      // It's a birthday QR - redirect to appropriate interface
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        setActive(false); // detener cámara antes de salir
        // pequeña pausa para permitir sonido/flash visual
        setTimeout(async () => {
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
          } catch (e) {
            // Fallback to public interface if session check fails
            window.location.href = `/marketing/birthdays/${encodeURIComponent(birthdayClaim.rid)}/qrs`;
          }
        }, 120);
      }
      return;
    }

    // Normal QR processing
    if (!resultsRef.current.some(r=>r.text===raw)) {
      const newResult: ScanResult = { text: raw, ts: Date.now() };
      setResults(prev => [newResult, ...prev].slice(0,25));
      setHistory(prev => {
        const updated = [newResult, ...prev.filter(r => r.text !== raw)].slice(0, 100);
        saveHistory(updated);
        return updated;
      });
      try { audioOkRef.current?.play().catch(()=>{}); } catch {}
      flashRef.current = { ts: Date.now() }; force(v=>v+1);
    }
  }, [maybeNavigate, decodeBirthdayQrFromText]);

  // Function to handle file upload for QR image processing
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file type before processing
      if (!file.type.startsWith('image/')) {
        setErr('El archivo debe ser una imagen (PNG, JPG, JPEG, etc.)');
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErr('La imagen es demasiado grande. Máximo 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result);
        try {
          // Try native BarcodeDetector first
          if ('BarcodeDetector' in window) {
            const detector = new (window as any).BarcodeDetector(['qr_code']);
            const img = new Image();
            img.onload = async () => {
              try {
                const results = await detector.detect(img);
                if (results && results.length > 0) {
                  const raw = (results[0] as any).rawValue;
                  await processQrText(raw);
                } else {
                  setErr('No se encontró código QR en la imagen');
                }
              } catch {
                // BarcodeDetector failed, will fallback to ZXing
              }
            };
            img.src = dataUrl;
          } else {
            // Fallback to ZXing
            const mod = await import('@zxing/browser');
            const Reader = (mod as any).BrowserMultiFormatReader;
            const codeReader = new Reader();
            try {
              const result = await codeReader.decodeFromImageUrl(dataUrl);
              const raw = result?.getText();
              if (raw) {
                await processQrText(raw);
              } else {
                setErr('No se encontró código QR en la imagen');
              }
            } catch (zxingError: any) {
              // Handle ZXing-specific errors more gracefully
              const errorMessage = zxingError?.message || '';
              if (errorMessage.includes('No MultiFormat Readers were able to detect the code') ||
                  errorMessage.includes('NotFoundException')) {
                setErr('No se pudo detectar un código QR válido en la imagen. Verifica que la imagen sea clara y contenga un código QR legible.');
              } else {
                setErr('Error al procesar la imagen. Intenta con una imagen más clara.');
              }
            }
          }
        } catch (e: any) {
          setErr('Error al procesar la imagen: ' + (e?.message || 'desconocido'));
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      setErr('Error al leer el archivo: ' + (e?.message || 'desconocido'));
    }
  }, [processQrText]);

  useEffect(()=>{
    if (!active) return;
    let stream: MediaStream|null = null; // Only used for native detector path
    let cancelled = false;

    async function init() {
      setErr(null);
      try {
        // Prefer native BarcodeDetector; otherwise fall back to @zxing/browser (same lib as IN/OUT scanner)
        if ('BarcodeDetector' in window) {
          // Native path
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(()=>{});
          }
          const formats = ['qr_code','ean_13','code_128','pdf417','aztec'];
            // Some browsers might throw if format unsupported; wrap in try
          try {
            detectorRef.current = new (window as any).BarcodeDetector({ formats });
          } catch {
            detectorRef.current = new (window as any).BarcodeDetector();
          }
          loopNative();
        } else {
          // Fallback path using ZXing continuous decode
          const mod = await import('@zxing/browser');
          const Reader = (mod as any).BrowserMultiFormatReader;
          const codeReader = new Reader();
          // decodeFromVideoDevice opens its own stream; we keep controls so we can stop later
          zxingControlsRef.current = await codeReader.decodeFromVideoDevice(undefined, videoRef.current!, (result: any, error: any, controls: any) => {
            if (result) {
              processRaw(result.getText());
            }
            // Ignore NotFound errors (normal when no code in frame)
          });
        }
      } catch(e:any) {
        setErr(e?.message || 'No se pudo acceder a la cámara');
      }
    }

    function loopNative() {
      if (cancelled) return;
      frameRef.current = requestAnimationFrame(loopNative);
      scanOnceNative();
    }

    function processRaw(raw: string) {
      if (!raw) return;
      if (isGlobalInOutCode(raw)) {
        const now = Date.now();
        if (now - lastNoticeTsRef.current > 1500) {
          lastNoticeTsRef.current = now;
          setNotice('Este escáner NO registra entradas/salidas. Usa la página de asistencia.');
          setTimeout(()=>{ setNotice(n => n === 'Este escáner NO registra entradas/salidas. Usa la página de asistencia.' ? null : n); }, 4000);
        }
        return;
      }
      processQrText(raw);
    }
    function isGlobalInOutCode(raw: string): boolean {
      if (!raw) return false; const text = String(raw).trim();
      // Direct JSON
      try {
        const j = JSON.parse(text);
        if (j && typeof j === 'object' && j.kind === 'GLOBAL' && (j.mode === 'IN' || j.mode === 'OUT')) return true;
      } catch {}
      // base64url JSON
      try {
        const pad = text.length % 4 === 2 ? '==' : text.length % 4 === 3 ? '=' : '';
        const b64 = text.replace(/-/g,'+').replace(/_/g,'/') + pad;
        const decoded = atob(b64);
        const j2 = JSON.parse(decoded);
        if (j2 && j2.kind === 'GLOBAL' && (j2.mode === 'IN' || j2.mode === 'OUT')) return true;
      } catch {}
      const upper = text.toUpperCase();
      if (upper === 'IN' || upper === 'OUT') return true;
      if (upper.startsWith('GLOBAL') && (upper.includes('IN') || upper.includes('OUT'))) return true;
      try {
        const url = new URL(text);
        const m = (url.searchParams.get('mode') || '').toUpperCase();
        if (m === 'IN' || m === 'OUT') return true;
      } catch {}
      return false;
    }
    async function scanOnceNative() {
      const det = detectorRef.current;
      if (!det || !videoRef.current) return;
      try {
        const detections = await det.detect(videoRef.current);
        if (detections && detections.length) {
          for (const d of detections) {
            const raw = (d as any).rawValue || (d as any).cornerPoints?.toString() || '';
            processRaw(raw);
          }
        }
      } catch {/* swallow */}
    }
    function maybeNavigate(raw: string) {
      if (redirectedRef.current) return;
      try {
        const url = new URL(raw);
        // Patrón principal: /b/<code>
        if (/^\/b\/[^/]{4,}$/.test(url.pathname)) {
          redirectedRef.current = true;
          setActive(false); // detener cámara antes de salir
          // pequeña pausa para permitir sonido/flash visual
          setTimeout(()=>{ window.location.href = raw; }, 120);
          return;
        }
        // Alternativos (por si en futuro los QR apuntan a marketing birthdays)
        if (/^\/marketing\/birthdays\//.test(url.pathname)) {
          redirectedRef.current = true;
          setActive(false);
          setTimeout(()=>{ window.location.href = raw; }, 120);
        }
      } catch {
        // no es URL absoluta; podría venir un code simple futuro: birthday:<code>
        if (/^https?:\/\//i.test(raw) === false && /^bday:/i.test(raw)) {
          // Formato hipotético bday:<code>
          const code = raw.split(':')[1];
          if (code && code.length >= 4 && !redirectedRef.current) {
            redirectedRef.current = true;
            setActive(false);
            setTimeout(()=>{ window.location.href = `/b/${encodeURIComponent(code)}`; }, 120);
          }
        }
      }
    }
    init();
    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (stream) stream.getTracks().forEach(t=>t.stop()); // native path
      try { zxingControlsRef.current?.stop?.(); } catch {}
    };
  }, [active]);

  function copy(t:string){
    try { navigator.clipboard?.writeText(t); } catch {}
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-3 py-3 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <audio ref={audioOkRef} src="/sounds/scan-ok.mp3" preload="auto" />

      {/* Header */}
      <div className="w-full max-w-5xl mx-auto mb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
          >
            <IconArrowLeft size={18} />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <IconQrcode size={20} className="text-teal-500" />
            Escáner Multiusos
          </h1>
          <div className="w-12" />
        </div>
      </div>

      {/* Notice (IN/OUT warning) */}
      {notice && (
        <div className="max-w-5xl mx-auto mb-3">
          <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-200 text-xs px-3 py-2 flex items-center gap-2">
            <span>⚠️</span>
            <span className="flex-1">{notice}</span>
            <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 flex-shrink-0"><IconX size={14} /></button>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-4">
        {/* Scanner column */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            {/* Viewport */}
            <div className="relative">
              <video ref={videoRef} className="w-full aspect-[4/3] object-cover bg-black" muted playsInline />
              {active && (
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  {/* Corner brackets */}
                  <div className="absolute left-4 top-4 h-8 w-8 border-l-[3px] border-t-[3px] border-teal-400 rounded-tl-lg" />
                  <div className="absolute right-4 top-4 h-8 w-8 border-r-[3px] border-t-[3px] border-teal-400 rounded-tr-lg" />
                  <div className="absolute left-4 bottom-4 h-8 w-8 border-l-[3px] border-b-[3px] border-teal-400 rounded-bl-lg" />
                  <div className="absolute right-4 bottom-4 h-8 w-8 border-r-[3px] border-b-[3px] border-teal-400 rounded-br-lg" />
                  {/* Scan line */}
                  <div className="absolute left-6 right-6 top-1/2 h-0.5 bg-teal-400/50 animate-scanline" />
                  {/* Status badge */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/80 text-white backdrop-blur-sm flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Escaneando
                  </div>
                </div>
              )}
              {/* Camera off state */}
              {!active && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white">
                  <IconCameraOff size={48} className="opacity-40 mb-3" />
                  <p className="text-sm opacity-60">Cámara pausada</p>
                  <button
                    onClick={() => setActive(true)}
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <IconCamera size={16} /> Iniciar
                  </button>
                </div>
              )}
            </div>

            {/* Controls bar */}
            <div className="p-3 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setActive(a => !a)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  active
                    ? "border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                    : "border-teal-300 dark:border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100"
                }`}
              >
                {active ? <><IconCameraOff size={16} /> Pausar</> : <><IconCamera size={16} /> Escanear</>}
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                <IconPhoto size={16} />
                Imagen
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
              <div className="flex-1" />
              {results.length > 0 && (
                <button
                  onClick={() => setResults([])}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <IconTrash size={12} /> Limpiar sesión
                </button>
              )}
            </div>
          </div>

          {err && (
            <div className="mt-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs px-3 py-2 flex items-center justify-between">
              <span>{err}</span>
              <button onClick={() => setErr(null)} className="ml-2 opacity-60 hover:opacity-100"><IconX size={14} /></button>
            </div>
          )}

          {/* Supported formats */}
          <div className="mt-3 px-1">
            <div className="flex flex-wrap gap-1.5 justify-center text-[10px] font-medium text-gray-500 dark:text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">QR Code</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">EAN-13</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">Code 128</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">🎁 Ofertas</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">🎂 Cumpleaños</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700">🎟️ Invitaciones</span>
            </div>
          </div>
        </div>
        {/* Results panel */}
        <div className="w-full lg:w-80 lg:flex-shrink-0">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Códigos Escaneados</h2>
              {(() => {
                const combined = [...results, ...history.filter(h => !results.some(r => r.text === h.text))];
                return combined.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-semibold">
                    {combined.length}
                  </span>
                );
              })()}
            </div>
            <div className="max-h-64 lg:max-h-[60vh] overflow-y-auto">
              {(() => {
                const combined = [...results, ...history.filter(h => !results.some(r => r.text === h.text))];
                return combined.length === 0 ? (
                  <div className="py-10 text-center text-xs text-gray-400 dark:text-slate-500">
                    <IconQrcode size={32} className="mx-auto mb-2 opacity-30" />
                    Sin códigos escaneados
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {combined.map(r => (
                      <div key={`${r.text}-${r.ts}`} className="group px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        {r.type === 'offer' && r.data ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">Oferta</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button
                                  onClick={() => {
                                    const isAdminContext = window.location.pathname.startsWith('/admin');
                                    const validationUrl = isAdminContext ? '/admin/offers/validate-qr' : '/validate-qr';
                                    sessionStorage.setItem('scannedQRData', r.text);
                                    window.location.href = validationUrl;
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-0.5"
                                >
                                  <IconExternalLink size={10} /> Validar
                                </button>
                                <button onClick={() => copy(r.text)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-400">
                                  <IconCopy size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-700 dark:text-slate-300 space-y-0.5">
                              <div className="font-medium truncate">{r.data.customerName}</div>
                              <div className="text-gray-500 dark:text-slate-400">{r.data.offer?.title || 'N/A'} · S/ {r.data.amount?.toFixed(2) || '?'}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-800 dark:text-slate-200 truncate font-mono" title={r.text}>{r.text}</span>
                            <button onClick={() => copy(r.text)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-400 flex-shrink-0 transition">
                              <IconCopy size={12} />
                            </button>
                          </div>
                        )}
                        <div className="text-[10px] text-gray-400 dark:text-slate-600 mt-0.5 tabular-nums">
                          {new Date(r.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      {/* Flash overlay */}
      {flashRef.current && Date.now() - flashRef.current.ts < 550 && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40">
          <div className="h-24 w-24 rounded-full bg-teal-500/80 ring-4 ring-teal-300 flex items-center justify-center animate-scanpop">
            <svg viewBox="0 0 24 24" className="h-14 w-14 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes scanpop { 0%{ transform:scale(.6); opacity:0;} 40%{transform:scale(1.05); opacity:1;} 70%{transform:scale(.95);} 100%{transform:scale(1); opacity:0;} }
        .animate-scanpop { animation: scanpop 550ms cubic-bezier(.16,.8,.3,1); }
        @keyframes scanlineMove { 0% { transform: translateY(0); opacity:.15;} 45%{opacity:.9;} 100% { transform: translateY(calc(100% - 2px)); opacity:.15;} }
        .animate-scanline { animation: scanlineMove 2.6s cubic-bezier(.45,.05,.55,.95) infinite; }
      `}</style>
    </div>
  );
}
