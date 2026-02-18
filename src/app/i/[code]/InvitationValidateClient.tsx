"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

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
  guestCategory?: string;
  courtesyNote?: string;
  additionalNote?: string;
  notes?: string;
  code?: string;
  eventStats?: {
    total: number;
    arrived: number;
    lastArrival: {
      arrivedAt: string;
      guestName: string;
    } | null;
  };
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/invitations/validate/${code}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j?.message || j?.code || "Invitación no válida");
        setData(j);

        // Generate QR code for the invitation code
        try {
          const qrUrl = await QRCode.toDataURL(code, {
            width: 200,
            margin: 2,
            color: {
              dark: '#ffffff',
              light: '#000000'
            }
          });
          setQrCodeUrl(qrUrl);
        } catch (qrError) {
          console.error('Error generating QR code:', qrError);
        }
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
      <div className="h-screen flex items-center justify-center bg-black text-white px-4">
        <div className="animate-pulse text-lg">Verificando invitación...</div>
      </div>
    );
  }

  if (err && !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white px-4">
        <div className="max-w-sm w-full text-center space-y-4">
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
    <div className="h-screen bg-gradient-to-b from-slate-950 via-black to-slate-950 text-white overflow-hidden flex flex-col">
      {/* Status Banner - Fixed at top */}
      {(isArrived || isCancelled || isExpired) && (
        <div className="flex-shrink-0 px-4 pt-4">
          {isArrived && (
            <div className="rounded-xl bg-emerald-900/50 border border-emerald-500 p-4 text-center max-w-md mx-auto">
              <div className="text-emerald-300 font-bold text-lg">Llegada registrada</div>
              {data.arrivedAt && <div className="text-emerald-400/70 text-xs mt-1">{fmtDateTime(data.arrivedAt)}</div>}
            </div>
          )}
          {isCancelled && (
            <div className="rounded-xl bg-rose-900/50 border border-rose-500 p-4 text-center max-w-md mx-auto">
              <div className="text-rose-300 font-bold text-lg">Invitación cancelada</div>
            </div>
          )}
          {isExpired && !isArrived && !isCancelled && (
            <div className="rounded-xl bg-amber-900/50 border border-amber-500 p-4 text-center max-w-md mx-auto">
              <div className="text-amber-300 font-bold text-lg">Invitación expirada</div>
            </div>
          )}
        </div>
      )}

      {/* Main Content - Takes remaining space */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 min-h-0">
        <div className="w-full max-w-md space-y-6">

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 backdrop-blur p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-xl w-full max-h-full overflow-y-auto">
          {/* Event Name */}
          <div className="text-center space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-widest">Invitación especial</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent leading-tight">
              {data.eventName}
            </h1>
            <div className="w-12 sm:w-16 h-1 bg-gradient-to-r from-pink-400 to-purple-400 mx-auto rounded-full"></div>
          </div>

          {/* Guest Name */}
          <div className="text-center bg-gradient-to-r from-slate-800/50 to-slate-800/30 rounded-xl p-3 sm:p-4 border border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">Invitado</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{data.guestName}</div>
          </div>

          {/* Event Details - Enhanced Grid */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl p-3 sm:p-4 text-center border border-slate-700/30">
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Fecha</div>
                <div className="font-bold text-base sm:text-lg text-pink-300">{fmtDate(data.eventDate)}</div>
              </div>
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl p-3 sm:p-4 text-center border border-slate-700/30">
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Hora</div>
                <div className="font-bold text-base sm:text-lg text-blue-300">{data.eventTimeSlot}</div>
              </div>
            </div>

            {data.eventLocation && (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl p-3 sm:p-4 text-center border border-slate-700/30">
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Ubicación</div>
                <div className="font-bold text-base sm:text-lg text-emerald-300">{data.eventLocation}</div>
              </div>
            )}
          </div>

          {/* QR Code Section for Public */}
          {!data.isStaff && (
            <div className="bg-gradient-to-r from-slate-800/30 to-slate-800/20 rounded-xl p-3 sm:p-4 border border-slate-700/50 text-center">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">Código de Invitación</div>
              {qrCodeUrl && (
                <div className="flex justify-center mb-3">
                  <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 sm:w-40 sm:h-40" />
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                Presenta este código al llegar al evento
              </div>
            </div>
          )}

          {/* Status Information */}
          {!isArrived && !isCancelled && !isExpired && (
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-3 sm:p-4 border border-blue-500/30 text-center">
              <div className="text-blue-300 font-semibold text-sm sm:text-base">Invitación válida</div>
            </div>
          )}

          {/* Staff-only section */}
          {data.isStaff && (
            <div className="border-t border-slate-700 pt-4 space-y-3">
              <div className="text-xs text-purple-400 uppercase tracking-widest font-semibold">Info Staff</div>

              {/* Event Statistics */}
              {data.eventStats && (
                <div className="bg-slate-800/30 rounded-lg p-3 space-y-2">
                  <div className="text-xs text-slate-400 uppercase tracking-widest">Estadísticas del Evento</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400">{data.eventStats.arrived}</div>
                      <div className="text-xs text-slate-500">Llegaron</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-400">{data.eventStats.total}</div>
                      <div className="text-xs text-slate-500">Total</div>
                    </div>
                  </div>
                  {data.eventStats.lastArrival && (
                    <div className="text-xs text-slate-400 border-t border-slate-700 pt-2 mt-2">
                      <div className="font-medium">Última llegada:</div>
                      <div>{data.eventStats.lastArrival.guestName}</div>
                      <div className="text-slate-500">{fmtDateTime(data.eventStats.lastArrival.arrivedAt)}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Guest details */}
              {data.guestCategory && data.guestCategory !== 'normal' && (
                <div className="mb-2">
                  {data.guestCategory === 'vip' && <span className="text-xs px-3 py-1 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">⭐ VIP</span>}
                  {data.guestCategory === 'influencer' && <span className="text-xs px-3 py-1 rounded-full font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">📸 Influencer</span>}
                </div>
              )}
              {data.courtesyNote && (
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-2 text-sm">
                  <span className="text-amber-400 font-medium">🎁 Cortesías:</span> <span className="text-amber-200">{data.courtesyNote}</span>
                </div>
              )}
              {data.additionalNote && (
                <div className="text-sm"><span className="text-slate-500">📝 Nota:</span> {data.additionalNote}</div>
              )}
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
                  {marking ? "Registrando..." : "Registrar Llegada"}
                </button>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Error message at bottom */}
      {err && (
        <div className="flex-shrink-0 px-4 pb-4">
          <div className="rounded-lg bg-rose-900/30 border border-rose-700 p-3 text-sm text-rose-200 text-center max-w-md mx-auto">
            {err}
          </div>
        </div>
      )}
    </div>
  );
}
