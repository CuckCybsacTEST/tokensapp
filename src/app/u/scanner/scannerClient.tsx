'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { verifySessionCookie, hasAnyRole } from '@/lib/auth';
import { verifyUserSessionCookie } from '@/lib/auth-user';

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

  // Function to check if user has staff/admin role
  const checkUserIsStaff = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[SCANNER] 🔍 Checking user role...');
      const allCookies = document.cookie;
      console.log('[SCANNER] 📋 All cookies string:', allCookies);
      const cookies = allCookies.split(';');
      console.log('[SCANNER] 🍪 Parsed cookies array:', cookies);

      // First check user_session (for /u/login users with STAFF role)
      const userSessionCookie = cookies.find(cookie => cookie.trim().startsWith('user_session='));
      console.log('[SCANNER] 👤 User session cookie found:', !!userSessionCookie);
      if (userSessionCookie) {
        const rawUserCookie = userSessionCookie.split('=')[1];
        console.log('[SCANNER] 🔑 Raw user cookie value (first 20 chars):', rawUserCookie.substring(0, 20) + '...');
        const userSession = await verifyUserSessionCookie(rawUserCookie);
        console.log('[SCANNER] 📊 User session data:', userSession);
        if (userSession) {
          console.log('[SCANNER] 🏷️ User role:', userSession.role);
          if (userSession.role === 'STAFF') {
            console.log('[SCANNER] ✅ User has STAFF role from user_session - ACCESS GRANTED');
            return true;
          } else {
            console.log('[SCANNER] ❌ User has role', userSession.role, 'but needs STAFF - ACCESS DENIED');
          }
        } else {
          console.log('[SCANNER] ❌ User session verification failed');
        }
      } else {
        console.log('[SCANNER] ❌ No user_session cookie found');
      }

      // Then check admin_session (for admin users)
      const adminSessionCookie = cookies.find(cookie => cookie.trim().startsWith('admin_session='));
      console.log('[SCANNER] 👑 Admin session cookie found:', !!adminSessionCookie);
      if (adminSessionCookie) {
        const rawAdminCookie = adminSessionCookie.split('=')[1];
        console.log('[SCANNER] 🔑 Raw admin cookie value (first 20 chars):', rawAdminCookie.substring(0, 20) + '...');
        const adminSession = await verifySessionCookie(rawAdminCookie);
        console.log('[SCANNER] 📊 Admin session data:', adminSession);
        const hasAdminRole = adminSession && hasAnyRole(adminSession, ['ADMIN', 'STAFF']);
        console.log('[SCANNER] 🏷️ Has admin/staff role from admin_session:', hasAdminRole);
        if (hasAdminRole) {
          console.log('[SCANNER] ✅ User has admin/staff role from admin_session - ACCESS GRANTED');
          return true;
        } else {
          console.log('[SCANNER] ❌ No admin/staff role from admin_session');
        }
      } else {
        console.log('[SCANNER] ❌ No admin_session cookie found');
      }

      console.log('[SCANNER] 🚫 No staff/admin role found in any session - ACCESS DENIED');
      return false;
    } catch (e) {
      console.error('[SCANNER] 💥 Error checking user role:', e);
      return false;
    }
  }, []);

  // Function to navigate to birthday pages
  const maybeNavigate = useCallback(async (raw: string) => {
    console.log('[SCANNER] maybeNavigate called with:', raw);
    if (redirectedRef.current) return;
    try {
      const url = new URL(raw);
      console.log('[SCANNER] URL parsed:', url.pathname);
      // Patrón principal: /b/<code> (tanto relativo como absoluto)
      if (/^\/b\/[^/]{4,}$/.test(url.pathname)) {
        console.log('[SCANNER] Birthday QR detected');
        redirectedRef.current = true;
        setActive(false); // detener cámara antes de salir
        const code = url.pathname.split('/')[2];
        console.log('[SCANNER] Extracted code:', code);
        const isStaffUser = await checkUserIsStaff();
        console.log('[SCANNER] Is staff user:', isStaffUser);
        
        if (isStaffUser) {
          console.log('[SCANNER] Redirecting to admin page');
          // For staff/admin users, get reservation ID and redirect to admin page
          try {
            const res = await fetch(`/api/birthdays/invite/${encodeURIComponent(code)}`, {
              credentials: 'include' // Include cookies in the request
            });
            console.log('[SCANNER] API response status:', res.status);
            if (res.ok) {
              const data = await res.json();
              console.log('[SCANNER] API data:', data);
              if (data?.reservation?.id) {
                const targetUrl = `/admin/birthdays/${data.reservation.id}`;
                console.log('[SCANNER] Redirecting to:', targetUrl);
                setTimeout(()=>{ window.location.href = targetUrl; }, 120);
                return;
              }
            }
          } catch (e) {
            console.error('Error fetching reservation ID:', e);
          }
          // Fallback if API call fails
          console.log('[SCANNER] API call failed, using fallback');
          setTimeout(()=>{ window.location.href = raw; }, 120);
        } else {
          console.log('[SCANNER] Not staff user, redirecting to public page');
          // Public users: redirect to public birthday page
          setTimeout(()=>{ window.location.href = raw; }, 120);
        }
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
          const isStaffUser = await checkUserIsStaff();
          
          if (isStaffUser) {
            // For staff/admin users, get reservation ID and redirect to admin page
            try {
              const res = await fetch(`/api/birthdays/invite/${encodeURIComponent(code)}`, {
                credentials: 'include' // Include cookies in the request
              });
              if (res.ok) {
                const data = await res.json();
                if (data?.reservation?.id) {
                  const targetUrl = `/admin/birthdays/${data.reservation.id}`;
                  setTimeout(()=>{ window.location.href = targetUrl; }, 120);
                  return;
                }
              }
            } catch (e) {
              console.error('Error fetching reservation ID:', e);
            }
            // Fallback
            const targetUrl = `/b/${encodeURIComponent(code)}`;
            setTimeout(()=>{ window.location.href = targetUrl; }, 120);
          } else {
            const targetUrl = `/b/${encodeURIComponent(code)}`;
            setTimeout(()=>{ window.location.href = targetUrl; }, 120);
          }
        }
      }
    }
  }, [checkUserIsStaff]);

  // Function to process QR text (extracted for reuse)
  const processQrText = useCallback(async (raw: string) => {
    if (!raw) return;

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

    // Normal QR processing
    if (!resultsRef.current.some(r=>r.text===raw)) {
      setResults(prev => [{ text: raw, ts: Date.now() }, ...prev].slice(0,25));
      try { audioOkRef.current?.play().catch(()=>{}); } catch {}
      flashRef.current = { ts: Date.now() }; force(v=>v+1);
    }
    // Intentar navegación automática si es un QR de cumpleaños (/b/<code>)
    maybeNavigate(raw);
  }, [maybeNavigate]);

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
              } catch (detErr) {
                // BarcodeDetector failed, will fallback to ZXing
                console.warn('BarcodeDetector failed, trying ZXing fallback:', detErr);
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
                console.error('ZXing error:', zxingError);
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
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-6">
      <div className="max-w-md mx-auto space-y-5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Escáner QR</h1>
        <audio ref={audioOkRef} src="/sounds/scan-ok.mp3" preload="auto" />
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">Escanea códigos operativos (invitaciones, tokens, cortesías). <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">No registra</strong> entradas / salidas; usa el panel de asistencia para eso.</p>
        {notice && <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-200 text-[11px] px-3 py-2 flex items-start gap-2"><span className="mt-0.5">⚠</span><span>{notice}</span></div>}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 shadow-sm">
          <div className="relative">
            <video ref={videoRef} className="w-full aspect-square object-cover rounded-lg bg-black" muted playsInline />
            {active && (
              <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[82%] aspect-square relative">
                  <div className="absolute top-0 left-0 h-10 w-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 h-10 w-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scanline" />
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <button onClick={()=>setActive(a=>!a)} className="btn h-9 px-4">{active?'Detener':'Iniciar'}</button>
            {active && <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />Escaneando…</div>}
            {!active && <div className="text-[11px] text-slate-500 dark:text-slate-400">Pausado</div>}
            <button disabled={!results.length} onClick={()=>setResults([])} className="text-[11px] underline text-slate-500 disabled:opacity-40">Limpiar</button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
              Subir imagen QR
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
          {err && <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">{err}</div>}
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Resultados</h2>
            {results.length>0 && <span className="text-[11px] text-slate-400 dark:text-slate-500">{results.length}</span>}
          </div>
          {results.length===0 && <div className="text-xs text-slate-500 dark:text-slate-400">Sin lecturas todavía.</div>}
          {results.length>0 && (
            <ul className="space-y-1 max-h-64 overflow-auto text-[13px] pr-1">
              {results.map(r => (
                <li key={r.ts} className="group flex flex-col gap-2 rounded border border-slate-200 dark:border-slate-600 px-3 py-2 bg-slate-50 dark:bg-slate-700/40">
                  {r.type === 'offer' && r.data ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded">Oferta QR</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button 
                            onClick={() => {
                              const isAdminContext = window.location.pathname.startsWith('/admin');
                              const validationUrl = isAdminContext ? '/admin/offers/validate-qr' : '/validate-qr';
                              sessionStorage.setItem('scannedQRData', r.text);
                              window.location.href = validationUrl;
                            }} 
                            className="text-[10px] px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white"
                          >
                            Validar
                          </button>
                          <button onClick={()=>copy(r.text)} className="text-[10px] px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white">Copiar</button>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div><strong>Cliente:</strong> {r.data.customerName}</div>
                        <div><strong>Oferta:</strong> {r.data.offer?.title || 'N/A'}</div>
                        <div><strong>Monto:</strong> S/ {r.data.amount?.toFixed(2) || 'N/A'}</div>
                        <div><strong>Fecha:</strong> {r.data.createdAt ? new Date(r.data.createdAt).toLocaleString('es-PE') : 'N/A'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate" title={r.text}>{r.text}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={()=>copy(r.text)} className="text-[10px] px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white">Copiar</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <a href="/u" className="text-blue-600 dark:text-blue-400 text-sm hover:underline">← Volver</a>
        </div>
      </div>
      {flashRef.current && Date.now()-flashRef.current.ts < 550 && (
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
