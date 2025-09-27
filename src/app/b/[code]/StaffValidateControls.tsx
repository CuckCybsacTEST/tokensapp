"use client";
import React, { useEffect, useState, useTransition } from 'react';

export default function StaffValidateControls({ code, isHost, multiUse, initialStatus }:{ code:string; isHost:boolean; multiUse: any; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [used, setUsed] = useState(multiUse?.used ?? (initialStatus === 'redeemed' ? 1 : 0));
  const [max, setMax] = useState(multiUse?.max ?? (multiUse ? 0 : 1));
  const [hostArrivedAt, setHostArrivedAt] = useState<Date | null>(null);
  const [guestArrivals, setGuestArrivals] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [consumedOnce, setConsumedOnce] = useState(false); // evita múltiples consumos sin re-escanear
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Marcar la “sesión de lectura” del QR al montar: si se recarga la página se considera un nuevo escaneo.
  useEffect(()=>{
    // Podemos guardar un flag temporal en sessionStorage con el código.
    try { sessionStorage.setItem(`scan:${code}`, Date.now().toString()); } catch {}
  }, [code]);

  function validate() {
    setErr(null);
    start(async () => {
      try {
        if (consumedOnce) return; // segunda pulsación ignorada hasta nuevo escaneo
        const res = await fetch(`/api/birthdays/invite/${encodeURIComponent(code)}`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ device: 'web', location: 'entrance' }) });
        const j = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(j?.code || j?.message || res.status);
        if (j.token) {
          setStatus(j.token.status);
          if (typeof j.token.usedCount === 'number') setUsed(j.token.usedCount);
          if (typeof j.token.maxUses === 'number') setMax(j.token.maxUses);
        }
        if (j.arrival) {
          setHostArrivedAt(j.arrival.hostArrivedAt ? new Date(j.arrival.hostArrivedAt) : null);
          setGuestArrivals(j.arrival.guestArrivals || 0);
        }
        setConsumedOnce(true);
        // Modal de confirmación
        const msg = isHost
          ? 'Cumpleañer@ registrado. ¡Disfruta tu celebración!'
          : 'Invitado registrado. ¡Bienvenid@ a la fiesta!';
        setModalMessage(msg);
        setShowModal(true);
      } catch(e:any) {
        setErr(String(e.message || e));
      }
    });
  }

  const exhausted = status === 'exhausted' || (max > 0 && used >= max);
  const already = status === 'redeemed' && !multiUse;
  const disableButton = pending || exhausted || already || consumedOnce;
  return (
    <div className="mt-4 border-t border-white/10 pt-3 space-y-2">
      <div className="text-[11px] uppercase tracking-wide font-semibold opacity-70">Validación Staff</div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={validate} disabled={disableButton} className="px-3 py-1 rounded bg-emerald-600 disabled:opacity-40 text-xs font-semibold">
          {pending ? 'Validando…' : isHost ? (hostArrivedAt ? 'Marcar llegada (listo)' : 'Marcar llegada') : exhausted ? 'Agotado' : consumedOnce ? 'Registrado' : 'Consumir'}
        </button>
        <div className="text-[11px] opacity-70">Estado: {status}{multiUse ? ` (${used}/${max})` : ''}</div>
        {isHost && hostArrivedAt && <div className="text-[11px] text-emerald-300">Llegó: {hostArrivedAt.toLocaleTimeString()}</div>}
        {!isHost && <div className="text-[11px] opacity-70">Ingresos invitados: {guestArrivals}</div>}
      </div>
      {err && <div className="text-[11px] text-red-300">{err}</div>}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-emerald-600/40 rounded-lg p-6 w-full max-w-sm text-center space-y-4">
            <h2 className="text-lg font-semibold text-emerald-300">Registro exitoso</h2>
            <p className="text-sm text-slate-200 leading-relaxed">{modalMessage}</p>
            <div className="flex flex-col gap-2">
              <button onClick={()=>{ window.location.href = '/u'; }} className="px-4 py-2 rounded bg-emerald-600 text-sm font-semibold">Volver al panel</button>
              <button onClick={()=>{ setShowModal(false); }} className="px-4 py-2 rounded bg-slate-700 text-xs">Cerrar</button>
            </div>
            <div className="text-[10px] opacity-50">Para otro ingreso escanea un nuevo código.</div>
          </div>
        </div>
      )}
    </div>
  );
}
