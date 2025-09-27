'use client';
import { useEffect, useRef, useState } from 'react';

interface ScanResult { text: string; ts: number; }

export default function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement|null>(null);
  const [active, setActive] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const lastNoticeTsRef = useRef<number>(0);
  const detectorRef = useRef<any>(null);
  const audioOkRef = useRef<HTMLAudioElement|null>(null);
  const flashRef = useRef<{ ts:number }|null>(null);
  const [, force] = useState(0);
  const frameRef = useRef<number>();

  useEffect(()=>{
    if (!active) return;
    let stream: MediaStream|null = null;
    let cancelled = false;
    async function init() {
      setErr(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(()=>{});
        }
        if ('BarcodeDetector' in window) {
          const formats = ['qr_code','ean_13','code_128','pdf417','aztec'];
          detectorRef.current = new (window as any).BarcodeDetector({ formats });
        } else {
          setErr('Tu navegador no soporta BarcodeDetector (usa Chrome/Edge reciente).');
        }
        loop();
      } catch(e:any) {
        setErr(e?.message || 'No se pudo acceder a la cámara');
      }
    }
    function loop() {
      if (cancelled) return;
      frameRef.current = requestAnimationFrame(loop);
      scanOnce();
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
    async function scanOnce() {
      const det = detectorRef.current;
      if (!det || !videoRef.current) return;
      try {
        const detections = await det.detect(videoRef.current);
        if (detections && detections.length) {
          for (const d of detections) {
            const raw = d.rawValue || d.cornerPoints?.toString() || '';
            if (!raw) continue;
            if (isGlobalInOutCode(raw)) {
              const now = Date.now();
              if (now - lastNoticeTsRef.current > 1500) {
                lastNoticeTsRef.current = now;
                setNotice('Este escáner NO registra entradas/salidas. Usa la página de asistencia.');
                setTimeout(()=>{ setNotice(n => n === 'Este escáner NO registra entradas/salidas. Usa la página de asistencia.' ? null : n); }, 4000);
              }
              continue; // ignorar estos códigos
            }
            if (raw && !results.some(r=>r.text===raw)) {
              setResults(prev => [{ text: raw, ts: Date.now() }, ...prev].slice(0,25));
              try { audioOkRef.current?.play().catch(()=>{}); } catch {}
              flashRef.current = { ts: Date.now() }; force(v=>v+1);
            }
          }
        }
      } catch {}
    }
    init();
    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (stream) stream.getTracks().forEach(t=>t.stop());
    };
  }, [active]);

  function copy(t:string){
    try { navigator.clipboard?.writeText(t); } catch {}
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-6">
      <div className="max-w-xl mx-auto space-y-4">
  <h1 className="text-2xl font-semibold text-slate-100 mb-2">Escáner QR</h1>
  <audio ref={audioOkRef} src="/sounds/scan-ok.mp3" preload="auto" />
        <p className="text-sm text-slate-300">Escanea códigos operativos (invitaciones, tokens, cortesías). <strong className="text-teal-300 font-semibold">No</strong> registra entradas/salidas.</p>
        {notice && <div className="rounded border border-amber-600 bg-amber-900/30 text-amber-200 text-xs px-3 py-2">{notice}</div>}
        <div className="rounded border border-slate-600 p-3 bg-slate-900">
          <video ref={videoRef} className="w-full aspect-video object-cover rounded bg-black" muted playsInline />
          <div className="mt-3 flex gap-2">
            <button onClick={()=>setActive(a=>!a)} className="px-3 py-1.5 rounded text-sm font-medium bg-teal-600 hover:bg-teal-500 disabled:opacity-50">{active?'Detener':'Iniciar'}</button>
            {active && <span className="text-xs text-slate-400 self-center">Escaneando…</span>}
          </div>
          {err && <div className="mt-2 text-xs text-red-400">{err}</div>}
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-slate-100">Resultados</h2>
          {results.length===0 && <div className="text-sm text-slate-400">Sin lecturas todavía.</div>}
          <ul className="space-y-1 max-h-64 overflow-auto text-sm">
            {results.map(r => (
              <li key={r.ts} className="group flex items-center justify-between gap-2 rounded border border-slate-600 px-2 py-1 bg-slate-800/60">
                <span className="truncate" title={r.text}>{r.text}</span>
                <button onClick={()=>copy(r.text)} className="opacity-0 group-hover:opacity-100 transition text-xs bg-slate-700 hover:bg-slate-600 rounded px-2 py-0.5">Copiar</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <a href="/u" className="text-blue-500 text-sm hover:underline">← Volver</a>
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
      `}</style>
    </div>
  );
}
