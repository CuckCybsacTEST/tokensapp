"use client";
import { useEffect, useState } from 'react';

/*
  Página pública para que el usuario vea el estado de su reserva.
  Parámetros: ?rid=<reservationId>
  No expone datos sensibles (oculta teléfono, documento completo si se quisiera en el futuro).
*/

type ReservationPublic = {
  id: string;
  celebrantName: string;
  date: string;
  timeSlot: string;
  status: string;
  tokensGeneratedAt?: string | null;
};

export default function PublicBirthdayStatusPage(){
  const [rid, setRid] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [reservation, setReservation] = useState<ReservationPublic|null>(null);

  useEffect(()=>{
    const url = new URL(window.location.href);
    const id = url.searchParams.get('rid') || '';
    setRid(id);
    if (id) fetchStatus(id);
  }, []);

  async function fetchStatus(id:string){
    setLoading(true); setError(null); setReservation(null);
    try {
      const res = await fetch(`/api/birthdays/public/reservation?id=${encodeURIComponent(id)}`);
      const j = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(j?.code||j?.message||res.status);
      setReservation(j.reservation);
    } catch(e:any){ setError(String(e?.message||e)); }
    finally { setLoading(false); }
  }

  function statusBadge(st:string){
    const base = 'text-[11px] px-2 py-0.5 rounded-full border font-semibold';
    switch(st){
      case 'pending_review': return base + ' bg-amber-500/15 border-amber-500/40 text-amber-300';
      case 'approved': return base + ' bg-emerald-600/20 border-emerald-500/40 text-emerald-300';
      case 'completed': return base + ' bg-blue-600/20 border-blue-500/40 text-blue-300';
      case 'canceled': return base + ' bg-rose-600/20 border-rose-500/40 text-rose-300';
      default: return base + ' bg-slate-600/20 border-slate-500/40 text-slate-300';
    }
  }

  return (
    <section className="min-h-screen px-4 py-10 text-white" style={{background:'linear-gradient(180deg,#0d0d0f,#121218 60%,#0d0d0f)'}}>
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Estado de tu Reserva</h1>
        {!rid && <p className="text-sm opacity-70">Falta el parámetro <code>rid</code>. Accede desde el buscador.</p>}
        {rid && !loading && !reservation && !error && (
          <p className="text-sm opacity-70">No se encontró la reserva. Verifica el identificador.</p>
        )}
        {loading && <p className="text-sm animate-pulse opacity-80">Cargando…</p>}
        {error && <div className="text-sm border border-rose-600 bg-rose-900/30 p-3 rounded">{error}</div>}
        {reservation && (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-lg font-semibold">{reservation.celebrantName}</div>
              <span className={statusBadge(reservation.status)}>{reservation.status}</span>
            </div>
            <div className="text-sm opacity-80">Fecha: {reservation.date} · Horario: {reservation.timeSlot}</div>
            <div className="text-xs opacity-60">ID: {reservation.id}</div>
            <div className="text-sm mt-2">
              {reservation.status === 'pending_review' && (
                <p>Tu reserva está en revisión. Te notificaremos cuando sea aprobada.</p>
              )}
              {reservation.status === 'approved' && (
                <p>¡Tu reserva fue aprobada! Tus tarjetas QR estarán disponibles pronto (si no las ves, consulta con el staff).</p>
              )}
              {reservation.status === 'completed' && (
                <p>La experiencia está completada. ¡Gracias por celebrar con nosotros!</p>
              )}
              {reservation.status === 'canceled' && (
                <p>La reserva fue cancelada. Si crees que es un error, contáctanos.</p>
              )}
            </div>
            <div className="pt-2 border-t border-white/10 text-xs opacity-50">Esta vista no muestra datos sensibles. Conserva tu enlace.</div>
            <div className="flex gap-3 pt-1">
              <a href="/marketing" className="text-xs underline opacity-80 hover:opacity-100">Volver al inicio</a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
