"use client";

import { useEffect, useState } from "react";

type InvitationData = {
  guestName: string;
  eventName: string;
  eventDate: string;
  eventTimeSlot: string;
  eventLocation: string | null;
  status: string;
  arrivedAt: string | null;
  expiresAt: string | null;
  isStaff?: boolean;
  // Staff-only fields
  guestPhone?: string;
  guestWhatsapp?: string;
  guestEmail?: string;
  guestDni?: string;
  notes?: string;
  code?: string;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const lima = new Date(d.getTime() - 5 * 3600 * 1000);
    const day = lima.getUTCDate();
    const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    return `${day} de ${months[lima.getUTCMonth()]} ${lima.getUTCFullYear()}`;
  } catch {
    return "";
  }
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const lima = new Date(d.getTime() - 5 * 3600 * 1000);
    const y = lima.getUTCFullYear();
    const m = String(lima.getUTCMonth() + 1).padStart(2, "0");
    const day = String(lima.getUTCDate()).padStart(2, "0");
    const hh = String(lima.getUTCHours()).padStart(2, "0");
    const mm = String(lima.getUTCMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return "";
  }
}

export function InvitationValidateClient({ code }: { code: string }) {
  const [data, setData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [markDone, setMarkDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/invitations/validate/${code}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j?.message || j?.code || "Invitación no válida");
        setData(j);
      } catch (e: any) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  async function handleMarkArrival() {
    setMarking(true);
    setErr(null);
    try {
      const res = await fetch(`/api/invitations/validate/${code}`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.code || "Error");
      setMarkDone(true);
      setData((prev) => prev ? { ...prev, status: "arrived", arrivedAt: new Date().toISOString() } : prev);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-pulse text-lg">Verificando invitación...</div>
      </div>
    );
  }

  if (err && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="text-5xl">❌</div>
          <h1 className="text-xl font-bold text-rose-400">Invitación no válida</h1>
          <p className="text-slate-400 text-sm">{err}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isArrived = data.status === "arrived" || markDone;
  const isCancelled = data.status === "cancelled";
  const isExpired = data.expiresAt && new Date(data.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-black to-slate-950 text-white p-4 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        {/* Status Banner */}
        {isArrived && (
          <div className="rounded-xl bg-emerald-900/50 border border-emerald-500 p-4 text-center">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-emerald-300 font-bold text-lg">Llegada registrada</div>
            {data.arrivedAt && <div className="text-emerald-400/70 text-xs mt-1">{fmtDateTime(data.arrivedAt)}</div>}
          </div>
        )}
        {isCancelled && (
          <div className="rounded-xl bg-rose-900/50 border border-rose-500 p-4 text-center">
            <div className="text-4xl mb-2">🚫</div>
            <div className="text-rose-300 font-bold text-lg">Invitación cancelada</div>
          </div>
        )}
        {isExpired && !isArrived && !isCancelled && (
          <div className="rounded-xl bg-amber-900/50 border border-amber-500 p-4 text-center">
            <div className="text-4xl mb-2">⏰</div>
            <div className="text-amber-300 font-bold text-lg">Invitación expirada</div>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 backdrop-blur p-6 space-y-4 shadow-xl">
          {/* Event Name */}
          <div className="text-center space-y-1">
            <div className="text-xs text-slate-500 uppercase tracking-widest">Invitación especial</div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {data.eventName}
            </h1>
          </div>

          {/* Guest Name */}
          <div className="text-center">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Invitado</div>
            <div className="text-xl font-bold">{data.guestName}</div>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-0.5">Fecha</div>
              <div className="font-semibold text-pink-300">{fmtDate(data.eventDate)}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-0.5">Hora</div>
              <div className="font-semibold">{data.eventTimeSlot}</div>
            </div>
          </div>

          {data.eventLocation && (
            <div className="bg-slate-800/50 rounded-lg p-3 text-center text-sm">
              <div className="text-xs text-slate-500 mb-0.5">Ubicación</div>
              <div className="font-semibold">{data.eventLocation}</div>
            </div>
          )}

          {/* Staff-only section */}
          {data.isStaff && (
            <div className="border-t border-slate-700 pt-4 space-y-2">
              <div className="text-xs text-purple-400 uppercase tracking-widest font-semibold">Info Staff</div>
              {data.guestWhatsapp && <div className="text-sm"><span className="text-slate-500">WhatsApp:</span> {data.guestWhatsapp}</div>}
              {data.guestPhone && <div className="text-sm"><span className="text-slate-500">Tel:</span> {data.guestPhone}</div>}
              {data.guestEmail && <div className="text-sm"><span className="text-slate-500">Email:</span> {data.guestEmail}</div>}
              {data.guestDni && <div className="text-sm"><span className="text-slate-500">DNI:</span> {data.guestDni}</div>}
              {data.notes && <div className="text-sm"><span className="text-slate-500">Notas:</span> {data.notes}</div>}

              {/* Mark arrival button */}
              {!isArrived && !isCancelled && (
                <button
                  className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-lg shadow-lg disabled:opacity-50 transition-all"
                  disabled={marking}
                  onClick={handleMarkArrival}
                >
                  {marking ? "Registrando..." : "✅ Registrar Llegada"}
                </button>
              )}
            </div>
          )}
        </div>

        {err && (
          <div className="rounded-lg bg-rose-900/30 border border-rose-700 p-3 text-sm text-rose-200 text-center">
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
