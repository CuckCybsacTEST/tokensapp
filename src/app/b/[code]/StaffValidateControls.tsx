"use client";
import React, { useState, useTransition } from 'react';

export default function StaffValidateControls({ code, isHost, multiUse, initialStatus }:{ code:string; isHost:boolean; multiUse: any; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [used, setUsed] = useState(multiUse?.used ?? (initialStatus === 'redeemed' ? 1 : 0));
  const [max, setMax] = useState(multiUse?.max ?? (multiUse ? 0 : 1));
  const [hostArrivedAt, setHostArrivedAt] = useState<Date | null>(null);
  const [guestArrivals, setGuestArrivals] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function validate() {
    setErr(null);
    start(async () => {
      try {
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
      } catch(e:any) {
        setErr(String(e.message || e));
      }
    });
  }

  const exhausted = status === 'exhausted' || (max > 0 && used >= max);
  const already = status === 'redeemed' && !multiUse;
  return (
    <div className="mt-4 border-t border-white/10 pt-3 space-y-2">
      <div className="text-[11px] uppercase tracking-wide font-semibold opacity-70">Validación Staff</div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={validate} disabled={pending || exhausted || already} className="px-3 py-1 rounded bg-emerald-600 disabled:opacity-40 text-xs font-semibold">
          {pending ? 'Validando…' : isHost ? (hostArrivedAt ? 'Re-validar' : 'Marcar llegada') : exhausted ? 'Agotado' : 'Consumir'}
        </button>
        <div className="text-[11px] opacity-70">Estado: {status}{multiUse ? ` (${used}/${max})` : ''}</div>
        {isHost && hostArrivedAt && <div className="text-[11px] text-emerald-300">Llegó: {hostArrivedAt.toLocaleTimeString()}</div>}
        {!isHost && <div className="text-[11px] opacity-70">Ingresos invitados: {guestArrivals}</div>}
      </div>
      {err && <div className="text-[11px] text-red-300">{err}</div>}
    </div>
  );
}
