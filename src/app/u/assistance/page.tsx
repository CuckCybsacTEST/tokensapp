"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface Detection { raw: string; ts: number; mode: 'IN'|'OUT'; }

export default function AssistanceScannerPage(){
  const videoRef = useRef<HTMLVideoElement|null>(null);
  // Comienza activo para que el escaneo arranque automáticamente sin requerir clic del usuario
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string|null>(null);
  // Información de usuario para saludo personalizado
  const [me, setMe] = useState<{ personName?: string; dni?: string } | null>(null);
  // Usar refs para evitar re-render y reinicios del loop por dependencias
  const lastRef = useRef<Detection|null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>();
  const zxingReaderRef = useRef<BrowserMultiFormatReader|null>(null);
  const audioOkRef = useRef<HTMLAudioElement|null>(null);
  const audioWarnRef = useRef<HTMLAudioElement|null>(null);
  const flashRef = useRef<{ ts:number; kind:'OK'|'WARN' }|null>(null);
  const [, forceFlashRerender] = useState(0);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<string|null>(null);
  const [recent, setRecent] = useState<any|null>(null); // shape { ok, recent: { id, scannedAt, type, businessDay, code, name } }
  const recentRef = useRef<any|null>(null);
  // Estado de confirmación cuando se registra ENTRADA o SALIDA (se detiene el escáner y se muestra resumen temporal)
  interface AttConfirm { person:{id:string; name:string; code:string}; businessDay?:string; at:Date }
  const [entryRegistered, setEntryRegistered] = useState<AttConfirm | null>(null);
  const [exitRegistered, setExitRegistered] = useState<null | { person: { id:string; name:string; code:string }; businessDay?: string; at: Date }>(null);
  // Modo pendiente para feedback inmediato (optimista) mientras esperamos respuesta del backend
  const [pendingMode, setPendingMode] = useState<null | 'IN' | 'OUT'>(null);
  const expectedRef = useRef<'IN'|'OUT'|null>(null);
  function triggerFlash(kind:'OK'|'WARN'){
    flashRef.current = { ts: Date.now(), kind };
    forceFlashRerender(v=>v+1);
  }

  // Capturar override inicial de expected (ej: ?expected=OUT) solo en cliente sin useSearchParams para evitar warning de Suspense
  useEffect(()=>{
    try {
      const usp = new URL(window.location.href).searchParams;
      const exp = (usp.get('expected')||'').toUpperCase();
      if(exp==='IN' || exp==='OUT') expectedRef.current = exp as 'IN'|'OUT';
    } catch {}
  }, []);

  const fetchRecent = useCallback(()=>{
    fetch('/api/attendance/me/recent', { cache: 'no-store' })
      .then(r=>{ if(r.status===401){ window.location.href='/u/login?next='+encodeURIComponent('/u/assistance'); return null; } return r.json(); })
  .then(j=>{ if(j && j.ok){ setRecent(j); recentRef.current = j; } })
      .catch(()=>{})
  },[]);

  // Cargar datos básicos del usuario para el nombre (independiente del historial reciente)
  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      try {
        const r = await fetch('/api/user/me', { cache: 'no-store' });
        if(r.status===401){ return; }
        const j = await r.json().catch(()=>({}));
        if(!cancelled && r.ok && j?.ok && j.user){
          setMe({ personName: j.user.personName, dni: j.user.dni });
        }
      } catch {}
    })();
    return ()=>{ cancelled=true; };
  }, []);

  useEffect(()=>{ fetchRecent(); }, [fetchRecent]);
  // Mantener recentRef sincronizado en cada cambio para uso dentro del loop sin re crear efecto
  useEffect(()=>{ recentRef.current = recent; }, [recent]);

  function deriveNextMode(): 'IN'|'OUT' {
  const r = recentRef.current;
  const last = r?.recent;
  if(!last) return 'IN';
  return last.type === 'IN' ? 'OUT' : 'IN';
  }

  function parseInOut(raw: string): 'IN'|'OUT'|null {
    if(!raw) return null;
    const text = raw.trim();
    const upper = text.toUpperCase();
    if(upper === 'IN' || upper === 'OUT') return upper as 'IN'|'OUT';
    // JSON directo kind GLOBAL
    try { const j = JSON.parse(text); if(j && typeof j==='object' && j.kind==='GLOBAL' && (j.mode==='IN'||j.mode==='OUT')) return j.mode; } catch{}
    // base64url JSON
    try { const pad = text.length % 4 === 2 ? '==' : text.length % 4 === 3 ? '=' : ''; const b64 = text.replace(/-/g,'+').replace(/_/g,'/')+pad; const dec = atob(b64); const j2 = JSON.parse(dec); if(j2 && j2.kind==='GLOBAL' && (j2.mode==='IN'||j2.mode==='OUT')) return j2.mode; } catch{}
    // URL con ?mode=
    try { const u = new URL(text); const m = (u.searchParams.get('mode')||'').toUpperCase(); if(m==='IN'||m==='OUT') return m as 'IN'|'OUT'; } catch{}
    // Texto que empiece con GLOBAL y contenga IN u OUT
    if(upper.startsWith('GLOBAL') && (upper.includes('IN') || upper.includes('OUT'))){
      if(upper.includes('IN') && !upper.includes('OUT')) return 'IN';
      if(upper.includes('OUT') && !upper.includes('IN')) return 'OUT';
      // Si contiene ambas decidir según siguiente esperado (fallback)
      return deriveNextMode();
    }
    return null;
  }

  useEffect(()=>{
  if(!active) return;
    let cancelled=false; let stream: MediaStream|null = null;
    async function init(){
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if(videoRef.current){ videoRef.current.srcObject = stream; await videoRef.current.play().catch(()=>{}); }
        if('BarcodeDetector' in window){
          detectorRef.current = new (window as any).BarcodeDetector({ formats:['qr_code']});
          loop();
        } else {
          // Fallback ZXing
            const reader = new BrowserMultiFormatReader();
            zxingReaderRef.current = reader;
            await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, videoRef.current!, (result, err) => {
              if(!active) return;
              if(registering) return;
              if(result){
                try { const raw = result.getText(); if(raw) handleRawCandidate(raw); } catch{}
              }
            });
        }
      } catch(e:any){ setError(e?.message || 'No se pudo acceder a la cámara'); }
    }
    function loop(){ if(cancelled) return; rafRef.current = requestAnimationFrame(loop); scanOnce(); }
    async function scanOnce(){
      const det = detectorRef.current; if(!det || !videoRef.current || registering) return;
      try {
        const detections = await det.detect(videoRef.current);
        if(detections && detections.length){
          for(const d of detections){
            const raw = d.rawValue || ''; if(!raw) continue;
            handleRawCandidate(raw);
            break;
          }
        }
      }catch{}
    }
    // triggerFlash definido afuera para poder usarlo también desde doRegister
    function triggerFlash(kind:'OK'|'WARN'){
      flashRef.current = { ts: Date.now(), kind };
      forceFlashRerender(v=>v+1);
    }
    function handleRawCandidate(raw: string){
      const mode = parseInOut(raw); if(!mode) return; // ignorar otros códigos
      const nextExpected = deriveNextMode();
      const override = expectedRef.current;
      const lastType = recentRef.current?.recent?.type as ('IN'|'OUT'|undefined);
      // Evitar enviar mismo tipo consecutivo para feedback inmediato (backend igual lo bloquea)
      // NUEVO: Silenciar duplicados (no flash amarillo, no mensaje). Simplemente ignorar.
      if(lastType && lastType === mode){
        return; // ignorar duplicado del mismo tipo
      }
      if(mode !== nextExpected && !(override && mode === override)){
        audioWarnRef.current?.play().catch(()=>{});
          triggerFlash('WARN');
        setMessage(`Se esperaba un código de ${override || nextExpected}. Escaneaste ${mode}.`);
        setTimeout(()=>{ setMessage(m=> m && m.startsWith('Se esperaba') ? null : m); }, 3500);
        return;
      }
      const last = lastRef.current;
      if(last && Date.now()-last.ts < 3000 && last.mode===mode) return; // debounce
      lastRef.current = { raw, ts: Date.now(), mode };
      doRegister(mode, raw);
      // Consumir override tras primer uso exitoso
      if(override && mode===override){ expectedRef.current = null; }
    }
    init();
    return ()=>{ cancelled=true; if(rafRef.current) cancelAnimationFrame(rafRef.current); if(stream) stream.getTracks().forEach(t=>t.stop()); try { zxingReaderRef.current?.reset(); } catch{} };
  }, [active, registering]);

  async function doRegister(mode: 'IN'|'OUT', raw: string){
    setRegistering(true); setMessage(null); setPendingMode(mode);
    // Feedback inmediato: para IN solo sonido; para OUT sonido + flash
    try {
      if(mode==='OUT'){ audioOkRef.current?.play().catch(()=>{}); triggerFlash('OK'); }
      else { audioOkRef.current?.play().catch(()=>{}); }
    } catch {}
    try {
      // Enviar deviceId para evitar requerir password (como flujo escáner) y permitir rate-limit por dispositivo
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/attendance/mark', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ mode, deviceId }) });
      if(res.status===401){ window.location.href='/u/login?next='+encodeURIComponent('/u/assistance'); return; }
      const j = await res.json().catch(()=>({}));
      if(!res.ok || !j.ok){
        const code = j?.code;
        // Silenciar duplicados o ya-hoy (no audio, no mensaje)
        if(code==='DUPLICATE' || code==='ALREADY_TODAY') return;
        // Reemplazar feedback optimista por advertencia
        audioWarnRef.current?.play().catch(()=>{}); triggerFlash('WARN');
        let friendly = 'Error registrando.';
        if(code==='NO_IN_TODAY') friendly = 'No tienes una ENTRADA previa.';
        else if(code==='OUT_COOLDOWN') friendly = `Debes esperar unos segundos antes de marcar SALIDA.`;
        else if(code==='PERSON_INACTIVE') friendly = 'Tu usuario está inactivo.';
        else if(code==='RATE_LIMIT') friendly = 'Demasiados intentos, espera un momento.';
        else if(code==='BAD_PASSWORD') friendly = 'Password incorrecto.';
        setMessage(friendly);
      }
      else {
        // Ya se mostró feedback optimista; actualizar estado real
        fetchRecent();
        if(mode === 'IN'){
          // Mostrar detalles inmediatamente (sin fase intermedia) para reducir retraso y evitar doble check
          setActive(false);
          const info = { person: j.person, businessDay: j.businessDay || j.utcDay, at: new Date() };
          setEntryRegistered(info);
          return; // detener aquí
        } else if(mode === 'OUT') {
          // Mostrar confirmación de salida y detener escaneo
          setActive(false);
          setExitRegistered({ person: j.person, businessDay: j.businessDay || j.utcDay, at: new Date() });
        }
      }
    } catch { audioWarnRef.current?.play().catch(()=>{}); triggerFlash('WARN'); setMessage('Error de red.'); }
    finally { setRegistering(false); setTimeout(()=>{ setMessage(m=> m && m.startsWith('✓') ? null: m); }, 3000); setPendingMode(null); }
  }

  function manualFallback(){ window.location.href='/u/manual'; }

  const nextExpected = deriveNextMode();

  function getOrCreateDeviceId(){
    try {
      const k='attScannerDeviceId';
      let v = localStorage.getItem(k); if(!v){ v = crypto.randomUUID(); localStorage.setItem(k,v); }
      return v;
    } catch { return undefined; }
  }

  // Derivar nombre del colaborador para saludo (preferir el del registro reciente o de confirmación)
  const collaboratorName = entryRegistered?.person?.name || exitRegistered?.person?.name || recent?.recent?.name || me?.personName || '';
  const firstName = collaboratorName.split(/\s+/)[0] || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-6 text-slate-800">
      <audio ref={audioOkRef} src="/sounds/scan-ok.mp3" preload="auto" />
      <audio ref={audioWarnRef} src="/sounds/scan-warn.mp3" preload="auto" />
      {flashRef.current && Date.now()-flashRef.current.ts < 650 && (
        <div className={`pointer-events-none fixed inset-0 z-40 flex items-center justify-center ${flashRef.current.kind==='OK' ? 'bg-emerald-500/10' : 'bg-amber-600/10'}`}>
          <div className={`rounded-full h-28 w-28 flex items-center justify-center ring-4 ${flashRef.current.kind==='OK' ? 'bg-emerald-500/80 ring-emerald-300' : 'bg-amber-600/80 ring-amber-300'} animate-attpulse`}> 
            {flashRef.current.kind==='OK' ? (
              <svg viewBox="0 0 24 24" className="h-14 w-14 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-14 w-14 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
            )}
          </div>
        </div>
      )}
      <div className="max-w-md mx-auto space-y-4">
  {!entryRegistered && !exitRegistered && !pendingMode && (
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {nextExpected === 'IN' ? (
                <span>
                  Hola{firstName ? `, ${firstName}` : ''}, este es el escáner de <span className="text-emerald-700 font-semibold">ENTRADA</span>
                </span>
              ) : (
                <span><span className="text-indigo-600">Buen trabajo</span>, registra tu <span className="text-indigo-700">SALIDA</span></span>
              )}
            </h1>
            <p className="text-xs text-slate-500">
              {nextExpected === 'IN' ? 'Escanea el código IN para registrar.' : 'Escanea el código OUT para cerrar.'}
            </p>
          </div>
        )}
        {pendingMode==='IN' && !entryRegistered && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-5 space-y-4 animate-fadeIn shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 flex items-center justify-center">
                <div className="h-10 w-10 rounded-full border-2 border-emerald-300/60 flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                </div>
              </div>
              <div>
                <div className="text-emerald-700 font-semibold">Procesando entrada…</div>
                <div className="text-xs text-emerald-600/80">Confirmando con el servidor…</div>
              </div>
            </div>
            <div className="h-2 w-full bg-emerald-100 rounded overflow-hidden">
              <div className="h-full w-2/3 bg-emerald-400 animate-pulse" />
            </div>
          </div>
        )}
        {entryRegistered && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 space-y-3 animate-fadeIn shadow-sm">
            <div className="text-emerald-700 font-semibold flex items-center gap-2">✓ Entrada registrada</div>
            <div className="text-sm text-emerald-800 space-y-1">
              <div><span className="text-emerald-600/90">Nombre:</span> {entryRegistered?.person?.name}</div>
              <div><span className="text-emerald-600/90">Código:</span> {entryRegistered?.person?.code}</div>
              <div><span className="text-emerald-600/90">Hora local:</span> {entryRegistered?.at?.toLocaleTimeString()}</div>
              <div><span className="text-emerald-600/90">Fecha:</span> {entryRegistered?.at?.toLocaleDateString()}</div>
              {entryRegistered?.businessDay && <div><span className="text-emerald-600/90">Business Day:</span> {entryRegistered?.businessDay}</div>}
            </div>
            <div className="pt-2 flex gap-2">
              <a href={`/u/checklist?day=${encodeURIComponent(entryRegistered.businessDay || new Date().toISOString().slice(0,10))}&mode=IN`} className="inline-flex flex-1 items-center justify-center rounded-md bg-emerald-600 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-500 shadow-sm">Ver lista de tareas</a>
              <a href="/u" className="inline-flex items-center justify-center rounded-md border border-emerald-300 bg-white text-emerald-700 text-sm font-medium px-4 py-2 hover:bg-emerald-50">Panel</a>
            </div>
          </div>
        )}
        {!entryRegistered && !exitRegistered && !pendingMode && (
          <>
            <div className="rounded-xl border border-slate-200 p-3 bg-white shadow-sm">
              <div className="relative">
                <video ref={videoRef} className="w-full aspect-square object-cover rounded-lg bg-black" muted playsInline />
                {/* Scan frame overlay */}
                {active && (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-[82%] aspect-square relative">
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 h-10 w-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]"></div>
                      <div className="absolute top-0 right-0 h-10 w-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]"></div>
                      <div className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]"></div>
                      <div className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-emerald-400 rounded-br-lg drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]"></div>
                      {/* Animated scan line */}
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scanline"></div>
                    </div>
                  </div>
                )}
                {!active && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-lg">
                    <span className="text-white text-sm font-medium tracking-wide">Pausado</span>
                  </div>
                )}
              </div>
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Escaneando…
                  </div>
                </div>
              {error && <div className="mt-2 text-xs text-red-600 font-medium">{error}</div>}
              <div className="mt-4">
                <button onClick={manualFallback} className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[.985] transition shadow-sm">
                  <span>Modo manual</span>
                </button>
              </div>
            </div>
            {message && (
              <div className={`rounded-md px-3 py-2 text-sm border shadow-sm ${message.startsWith('✓') ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-amber-50 border-amber-300 text-amber-700'}`}>{message}</div>
            )}
            <div className="text-xs text-slate-500">{nextExpected==='IN' ? 'Prepárate para comenzar.' : 'Cierra cuando estés listo.'}</div>
            {recent?.recent && (
              <div className="text-xs text-slate-500">Último registro: {recent.recent.type} {recent.recent.scannedAt ? '· '+ new Date(recent.recent.scannedAt).toLocaleTimeString() : ''} {recent.recent.businessDay ? '· '+recent.recent.businessDay : ''}</div>
            )}
          </>
        )}
        {exitRegistered && (
          <div className="rounded-md border border-indigo-300 bg-indigo-50 p-4 space-y-3 shadow-sm">
            <div className="text-indigo-700 font-semibold flex items-center gap-2">✓ Salida registrada</div>
            <div className="text-sm text-indigo-800 space-y-1">
              <div><span className="text-indigo-600/90">Nombre:</span> {exitRegistered.person.name}</div>
              <div><span className="text-indigo-600/90">Código:</span> {exitRegistered.person.code}</div>
              <div><span className="text-indigo-600/90">Hora local:</span> {exitRegistered.at.toLocaleTimeString()}</div>
              <div><span className="text-indigo-600/90">Fecha:</span> {exitRegistered.at.toLocaleDateString()}</div>
              {exitRegistered.businessDay && <div><span className="text-indigo-600/90">Business Day:</span> {exitRegistered.businessDay}</div>}
            </div>
            <div className="text-xs text-indigo-600/80">¡Buen trabajo hoy! Descansa y nos vemos en tu próxima jornada.</div>
            <div className="pt-2">
              <a href="/u" className="block w-full text-center px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-indigo-300">Volver al panel</a>
            </div>
          </div>
        )}
        <div>
          <a href="/u" className="text-blue-600 text-sm hover:underline">← Volver</a>
        </div>
      </div>
      <style jsx global>{`
        @keyframes attpulse { 0%{ transform:scale(.6); opacity:0;} 40%{transform:scale(1.05); opacity:1;} 70%{transform:scale(.97);} 100%{transform:scale(1); opacity:0;} }
        .animate-attpulse { animation: attpulse 650ms cubic-bezier(.16,.8,.3,1); }
          @keyframes scanlineMove { 0% { transform: translateY(0); opacity:.15;} 45%{opacity:.9;} 100% { transform: translateY(calc(100% - 2px)); opacity:.15;} }
          .animate-scanline { animation: scanlineMove 2.6s cubic-bezier(.45,.05,.55,.95) infinite; }
      `}</style>
    </div>
  );
}
