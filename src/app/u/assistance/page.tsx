"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface Detection { raw: string; ts: number; mode: 'IN'|'OUT'; }

export default function AssistanceScannerPage(){
  const videoRef = useRef<HTMLVideoElement|null>(null);
  // Comienza activo para que el escaneo arranque automáticamente sin requerir clic del usuario
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string|null>(null);
  // Usar refs para evitar re-render y reinicios del loop por dependencias
  const lastRef = useRef<Detection|null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>();
  const zxingReaderRef = useRef<BrowserMultiFormatReader|null>(null);
  const audioOkRef = useRef<HTMLAudioElement|null>(null);
  const audioWarnRef = useRef<HTMLAudioElement|null>(null);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<string|null>(null);
  const [recent, setRecent] = useState<any|null>(null); // shape { ok, recent: { id, scannedAt, type, businessDay, code, name } }
  const recentRef = useRef<any|null>(null);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const fetchRecent = useCallback(()=>{
    setLoadingRecent(true);
    fetch('/api/attendance/me/recent', { cache: 'no-store' })
      .then(r=>{ if(r.status===401){ window.location.href='/u/login?next='+encodeURIComponent('/u/assistance'); return null; } return r.json(); })
  .then(j=>{ if(j && j.ok){ setRecent(j); recentRef.current = j; } })
      .catch(()=>{})
      .finally(()=> setLoadingRecent(false));
  },[]);

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
    if(!active) return; // no iniciar si no está activo
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
    function handleRawCandidate(raw: string){
      const mode = parseInOut(raw); if(!mode) return; // ignorar otros códigos
      const nextExpected = deriveNextMode();
      if(mode !== nextExpected){
        audioWarnRef.current?.play().catch(()=>{});
        setMessage(`Se esperaba un código de ${nextExpected}. Escaneaste ${mode}.`);
        setTimeout(()=>{ setMessage(m=> m && m.startsWith('Se esperaba') ? null : m); }, 3500);
        return;
      }
      const last = lastRef.current;
      if(last && Date.now()-last.ts < 3000 && last.mode===mode) return; // debounce
      lastRef.current = { raw, ts: Date.now(), mode };
      doRegister(mode, raw);
    }
    init();
    return ()=>{ cancelled=true; if(rafRef.current) cancelAnimationFrame(rafRef.current); if(stream) stream.getTracks().forEach(t=>t.stop()); try { zxingReaderRef.current?.reset(); } catch{} };
  }, [active, registering]);

  async function doRegister(mode: 'IN'|'OUT', raw: string){
    setRegistering(true); setMessage(null);
    try {
      // Enviar deviceId para evitar requerir password (como flujo escáner) y permitir rate-limit por dispositivo
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/attendance/mark', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ mode, deviceId }) });
      if(res.status===401){ window.location.href='/u/login?next='+encodeURIComponent('/u/assistance'); return; }
      const j = await res.json().catch(()=>({}));
      if(!res.ok || !j.ok){
        audioWarnRef.current?.play().catch(()=>{});
        const code = j?.code;
        let friendly = 'Error registrando.';
        if(code==='DUPLICATE') friendly = 'Duplicado muy reciente.';
        else if(code==='ALREADY_TODAY') friendly = 'Ya marcado hoy.';
        else if(code==='NO_IN_TODAY') friendly = 'No tienes una ENTRADA previa.';
        else if(code==='OUT_COOLDOWN') friendly = `Debes esperar unos segundos antes de marcar SALIDA.`;
        else if(code==='PERSON_INACTIVE') friendly = 'Tu usuario está inactivo.';
        else if(code==='RATE_LIMIT') friendly = 'Demasiados intentos, espera un momento.';
        else if(code==='BAD_PASSWORD') friendly = 'Password incorrecto.';
        setMessage(friendly);
      }
      else { audioOkRef.current?.play().catch(()=>{}); setMessage(`✓ ${mode === 'IN' ? 'Entrada' : 'Salida'} registrada`); fetchRecent(); }
    } catch { audioWarnRef.current?.play().catch(()=>{}); setMessage('Error de red.'); }
    finally { setRegistering(false); setTimeout(()=>{ setMessage(m=> m && m.startsWith('✓') ? null: m); }, 3000); }
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

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-6">
      <audio ref={audioOkRef} src="/sounds/scan-ok.mp3" preload="auto" />
      <audio ref={audioWarnRef} src="/sounds/scan-warn.mp3" preload="auto" />
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-slate-100">Escáner de Asistencia</h1>
        <p className="text-sm text-slate-300">Escanea únicamente los códigos IN / OUT oficiales. Este escáner registra tu entrada o salida directamente.</p>
        <div className="rounded border border-slate-600 p-3 bg-slate-900">
          <video ref={videoRef} className="w-full aspect-square object-cover rounded bg-black" muted playsInline />
          <div className="mt-3 flex gap-2 items-center">
            <button onClick={()=>setActive(a=>!a)} className="px-3 py-1.5 rounded text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">{active?'Pausar':'Reanudar'}</button>
            {active && <span className="text-xs text-slate-400">Escaneando…</span>}
            <button onClick={manualFallback} className="ml-auto text-xs text-blue-400 hover:underline">Modo manual</button>
          </div>
          {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
        </div>
        <div className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm flex items-center justify-between">
          <div>
            <div className="text-slate-300">Siguiente esperado:</div>
            <div className="font-semibold text-indigo-300 tracking-wide text-lg">{nextExpected}</div>
          </div>
          <div className="text-xs text-slate-500 max-w-[150px] text-right">Apunta la cámara al póster oficial {nextExpected === 'IN' ? 'IN' : 'OUT'}.</div>
        </div>
        {message && <div className={`rounded px-3 py-2 text-sm ${message.startsWith('✓')? 'bg-emerald-600/20 border border-emerald-500 text-emerald-200':'bg-amber-700/30 border border-amber-600 text-amber-100'}`}>{message}</div>}
        <div className="text-xs text-slate-400">Si tienes problemas de lectura, cambia a modo manual.</div>
        {recent?.recent && (
          <div className="text-xs text-slate-400">Último: {recent.recent.type} {recent.recent.scannedAt ? '· '+ new Date(recent.recent.scannedAt).toLocaleTimeString() : ''} {recent.recent.businessDay ? '· '+recent.recent.businessDay : ''}</div>
        )}
        <div>
          <a href="/u" className="text-blue-500 text-sm hover:underline">← Volver</a>
        </div>
      </div>
    </div>
  );
}
