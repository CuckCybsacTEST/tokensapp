"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
// globals.css ahora sólo se importa en el root layout; no importar aquí para evitar chunks redundantes.

type Mode = "IN" | "OUT";
type Recent = { scannedAt?: string; type?: Mode; businessDay?: string } | null;

function ymdUtc(date: Date): string { return date.toISOString().slice(0,10); }

function ensureDeviceId(): string {
  try {
    const key = "scannerDeviceId";
    let v = localStorage.getItem(key);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(key, v); }
    return v;
  } catch { return "manual"; }
}

export default function ManualAttendancePage() {
  const [me, setMe] = useState<{ personName?: string; dni?: string } | null>(null);
  const [recent, setRecent] = useState<Recent>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ variant: "success" | "error"; text: string } | null>(null);
  const [flash, setFlash] = useState<{ mode: Mode; ts: number } | null>(null);
  const [holdMs, setHoldMs] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const [password, setPassword] = useState("");

  const nextAction: Mode = useMemo(() => {
    const t = recent?.type;
    if (t === "IN") return "OUT"; // si ya marcó entrada, ofrecer salida
    return "IN"; // por defecto entrada
  }, [recent]);

  useEffect(() => {
    (async () => {
      // Verificar sesión; si no está, redirigir a login
      try {
        const r = await fetch('/api/user/me', { cache: 'no-store' });
        if (r.status === 401) { window.location.href = '/u/login?next=' + encodeURIComponent('/u/manual'); return; }
        const j = await r.json();
        if (r.ok && j?.ok) setMe({ personName: j.user.personName, dni: j.user.dni });
      } catch {}
      // Reciente para sugerir acción
      try {
        const r2 = await fetch('/api/attendance/me/recent', { cache: 'no-store' });
        const j2 = await r2.json().catch(() => ({}));
        setRecent((j2?.recent ?? null) as Recent);
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (mode == null && !loading) setMode(nextAction); }, [loading, nextAction, mode]);

  const handleSubmit = async () => {
    if (!mode) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const deviceId = ensureDeviceId();
      const res = await fetch('/api/attendance/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode, password }) });
      const json: any = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setMsg({ variant: 'success', text: `${mode === 'IN' ? 'Entrada' : 'Salida'} registrada correctamente.` });
        setFlash({ mode, ts: Date.now() });
        try { playTone(mode); } catch {}
        // redirigir como el escáner
        const day = (json && typeof json.businessDay === 'string' && json.businessDay) || ymdUtc(new Date());
        setTimeout(() => {
          if (mode === 'IN') window.location.href = `/u/checklist?day=${day}&mode=IN`;
          else {
            const usp = new URLSearchParams();
            usp.set('day', day);
            if (json.scanId) usp.set('scanId', json.scanId);
            window.location.href = `/u/closed?${usp.toString()}`;
          }
        }, 700);
      } else {
        let code = String(json?.code || 'ERROR');
        if (code === 'DUPLICATE') code = 'REPLAY';
        const human = code === 'REPLAY' ? 'Intento duplicado (<10s)' :
                       code === 'PERSON_INACTIVE' ? 'Persona inactiva' :
                       code === 'ALREADY_TODAY' ? 'Ya registraste esta acción hoy' :
                       code === 'NO_IN_TODAY' ? 'No puedes registrar salida sin haber registrado entrada hoy' :
                       code === 'BAD_PASSWORD' ? 'Contraseña incorrecta' :
                       code === 'PASSWORD_REQUIRED' ? 'Ingresa tu contraseña' :
                       code === 'OUT_COOLDOWN' ? `Debes esperar ${json?.waitSeconds ?? 60}s desde tu entrada antes de registrar salida` : code;
        setMsg({ variant: 'error', text: human });
      }
    } catch (e: any) {
      setMsg({ variant: 'error', text: `Fallo de red: ${String(e?.message || e)}` });
    } finally {
      setSubmitting(false);
    }
  };

  // QR scanning removed for manual-only page (sin cámara)
  function playTone(m: Mode) {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = m === 'IN' ? 880 : 600; // IN más agudo
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Registrar entrada / salida</h1>
        </div>

        {msg && (
          <div className={"mb-4 rounded-md border p-3 text-sm transition-all duration-500 " + (msg.variant === 'success' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800')}>{msg.text}</div>
        )}

        <div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">Acción</label>
              <div className="flex items-center gap-6 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="mode" checked={mode === 'IN'} disabled={recent?.type === 'IN'} onChange={() => setMode('IN')} />
                  <span className={recent?.type==='IN' ? 'opacity-50' : ''}>Entrada</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="mode" checked={mode === 'OUT'} disabled={recent?.type === 'OUT'} onChange={() => setMode('OUT')} />
                  <span className={recent?.type==='OUT' ? 'opacity-50' : ''}>Salida</span>
                </label>
              </div>
              {recent?.type && <p className="mt-1 text-[11px] text-slate-500">No puedes repetir consecutivamente la misma acción ({recent.type}).</p>}
              {!loading && recent?.scannedAt && (
                <p className="mt-1 text-xs text-slate-500">Tu última marca: {new Date(recent.scannedAt!).toLocaleString()} ({recent.type === 'IN' ? 'Entrada' : 'Salida'})</p>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">Contraseña</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800" placeholder="Tu contraseña de acceso" />
            </div>

            <div className="mt-4 flex items-stretch gap-3">
              <div className="flex flex-1 gap-3">
                <button
                  className={`relative flex-1 rounded-md px-4 py-3 text-sm font-semibold shadow-sm transition active:scale-[.985] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed 
                    ${mode==='OUT'
                      ? 'bg-orange-600 hover:bg-orange-500 text-white focus:ring-orange-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-300'}`}
                  disabled={submitting || mode == null || password.length === 0}
                  onMouseDown={(e) => {
                    if (mode !== 'OUT') return; // long-press solo para salida
                    setHoldMs(0);
                    const start = Date.now();
                    const id = window.setInterval(() => {
                      const ms = Date.now() - start;
                      setHoldMs(ms);
                      if (ms >= 2000) {
                        window.clearInterval(id);
                        setHoldMs(0);
                        handleSubmit();
                      }
                    }, 50);
                    holdTimerRef.current = id as unknown as number;
                  }}
                  onMouseUp={() => { if (holdTimerRef.current) { window.clearInterval(holdTimerRef.current); holdTimerRef.current = null; setHoldMs(0); } }}
                  onMouseLeave={() => { if (holdTimerRef.current) { window.clearInterval(holdTimerRef.current); holdTimerRef.current = null; setHoldMs(0); } }}
                  onClick={(e) => { if (mode === 'OUT') { e.preventDefault(); return; } handleSubmit(); }}
                >
                  {submitting ? 'Enviando…' : (mode === 'OUT' ? (holdMs > 0 ? `Mantén… ${Math.ceil(Math.max(0, 2000 - holdMs)/1000)}s` : 'Mantén para Salida') : 'Registrar Entrada')}
                  {mode === 'OUT' && holdMs > 0 && (
                    <span className="absolute inset-x-0 bottom-0 h-1 rounded-b bg-orange-400" style={{ width: `${Math.min(100, (holdMs/2000)*100)}%` }} />
                  )}
                </button>
                <Link
                  href="/u/assistance"
                  prefetch={false}
                  className="flex-1 rounded-md px-4 py-3 text-sm font-semibold shadow-sm transition active:scale-[.985] focus:outline-none focus:ring-2 focus:ring-offset-2 bg-sky-600 hover:bg-sky-500 text-white text-center inline-flex items-center justify-center focus:ring-sky-300"
                >
                  Escanear QR
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          Interfaz manual. Reglas: una entrada y una salida por día (salida requiere entrada previa). Para flujo más rápido usa el escáner QR.
        </div>
      </div>
      {/* Flash overlay + toast */}
        {flash && Date.now() - flash.ts < 1400 && (
          <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
            <div className={"h-28 w-28 rounded-full flex items-center justify-center shadow-xl ring-4 animate-pop " + (flash.mode === 'IN' ? 'bg-green-500/90 ring-green-300' : 'bg-orange-500/90 ring-orange-300')}>
              <svg className="h-14 w-14 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {flash.mode === 'IN' ? <path d="M5 13l4 4L19 7" /> : <><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></>}
              </svg>
            </div>
          </div>
        )}
        {flash && Date.now() - flash.ts < 1800 && (
          <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex justify-center z-40">
            <div className={"px-6 py-4 rounded-2xl font-semibold tracking-wide shadow-xl backdrop-blur-md text-white text-lg animate-scale-fade " + (flash.mode === 'IN' ? 'bg-green-600/90' : 'bg-orange-600/90')}>
              {flash.mode === 'IN' ? 'Entrada registrada' : 'Salida registrada'}
            </div>
          </div>
        )}
      <style jsx global>{`
        @keyframes popInManual { 0% { transform: scale(.6); opacity:0;} 40%{transform:scale(1.05);opacity:1;} 70%{transform:scale(.97);} 100%{transform:scale(1);opacity:1;} }
        @keyframes scaleFadeManual { 0%{transform:scale(.85);opacity:0;} 30%{transform:scale(1);opacity:1;} 80%{transform:scale(1);opacity:1;} 100%{transform:scale(.98);opacity:0;} }
        .animate-pop { animation: popInManual 450ms cubic-bezier(.16,.8,.3,1); }
        .animate-scale-fade { animation: scaleFadeManual 1600ms cubic-bezier(.16,.8,.3,1); }
      `}</style>
    </div>
  );
}
