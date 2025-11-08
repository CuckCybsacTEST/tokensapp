"use client";
import React, { useEffect, useState, useTransition } from 'react';
import { DateTime } from 'luxon';

export default function StaffValidateControls({ code, isHost, multiUse, initialStatus, expiresAt, initialGuestArrivals = 0, lastGuestArrivalAt, reservationDate, reservationStatus, onValidate, buttonState }: { 
  code:string; 
  isHost:boolean; 
  multiUse: any; 
  initialStatus: string; 
  expiresAt: string | null; 
  initialGuestArrivals?: number; 
  lastGuestArrivalAt?: string | null; 
  reservationDate?: string; 
  reservationStatus?: string;
  onValidate?: () => void;
  buttonState?: { pending: boolean; disabled: boolean; text: string; };
}) {
  const [status, setStatus] = useState(initialStatus);
  const [used, setUsed] = useState(multiUse?.used ?? (initialStatus === 'redeemed' ? 1 : 0));
  const [max, setMax] = useState(multiUse?.max ?? (multiUse ? 0 : 1));
  const [hostArrivedAt, setHostArrivedAt] = useState<Date | null>(null);
  const [guestArrivals, setGuestArrivals] = useState<number>(initialGuestArrivals);
  const [lastGuestArrival, setLastGuestArrival] = useState<string | null>(lastGuestArrivalAt || null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [consumedOnce, setConsumedOnce] = useState(false); // evita múltiples consumos sin re-escanear
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Determinar si el token está disponible basado en la fecha de reserva
  const isTokenAvailable = () => {
    if (!reservationDate) return true; // Si no hay fecha de reserva, asumir disponible
    
    const nowLima = DateTime.now().setZone('America/Lima').startOf('day');
    const reservationLima = DateTime.fromISO(reservationDate).setZone('America/Lima').startOf('day');
    
    return nowLima >= reservationLima;
  };

  const tokenAvailable = isTokenAvailable();

  // Marcar la “sesión de lectura” del QR al montar: si se recarga la página se considera un nuevo escaneo.
  useEffect(()=>{
    // Podemos guardar un flag temporal en sessionStorage con el código.
    try { sessionStorage.setItem(`scan:${code}`, Date.now().toString()); } catch {}
  }, [code]);

  function validate() {
    if (onValidate) {
      onValidate();
      return;
    }
    console.log('[STAFF] Attempting validation for code:', code, 'consumedOnce:', consumedOnce);
    setErr(null);
    start(async () => {
      try {
        if (consumedOnce) {
          console.log('[STAFF] Validation blocked - already consumed once');
          return; // segunda pulsación ignorada hasta nuevo escaneo
        }
        console.log('[STAFF] Making POST request for validation');
        const res = await fetch(`/api/birthdays/invite/${encodeURIComponent(code)}`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ device: 'web', location: 'entrance' }) });
        const j = await res.json().catch(()=>({}));
        console.log('[STAFF] POST response:', { ok: res.ok, status: res.status, data: j });
        if (!res.ok) throw new Error(j?.code || j?.message || res.status);
        if (j.token) {
          console.log('[STAFF] Token updated:', { status: j.token.status, usedCount: j.token.usedCount, maxUses: j.token.maxUses });
          setStatus(j.token.status);
          if (typeof j.token.usedCount === 'number') setUsed(j.token.usedCount);
          if (typeof j.token.maxUses === 'number') setMax(j.token.maxUses);
        }
        if (j.arrival) {
          console.log('[STAFF] Arrival updated:', j.arrival);
          setHostArrivedAt(j.arrival.hostArrivedAt ? new Date(j.arrival.hostArrivedAt) : null);
          setGuestArrivals(j.arrival.guestArrivals || 0);
          if (j.arrival.lastGuestArrivalAt) {
            setLastGuestArrival(j.arrival.lastGuestArrivalAt);
          }
        }
        setConsumedOnce(true);
        console.log('[STAFF] Validation completed, consumedOnce set to true');
        // Modal de confirmación
        const msg = isHost
          ? 'Muestra este código al ingresar y disfruta de tu noche!'
          : 'Muestra este código al ingresar y disfruta de tu noche!';
        setModalMessage(msg);
        setShowModal(true);
      } catch(e:any) {
        setErr(String(e.message || e));
      }
    });
  }

  const exhausted = status === 'exhausted' || (max > 0 && used >= max);
  const already = status === 'redeemed' && !multiUse;
  const disableButton = buttonState?.disabled ?? (pending || exhausted || already || consumedOnce || !tokenAvailable);
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg">

      
      {/* Mostrar mensaje si la reserva está cancelada */}
      {reservationStatus === 'canceled' || reservationStatus === 'cancelled' ? (
        <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-100 text-center">
          <div className="text-lg mb-1">❌ Reserva Cancelada</div>
          <div className="text-sm opacity-80">
            Esta reserva ha sido cancelada y no se pueden registrar llegadas.
          </div>
        </div>
      ) : (
        <>
          {/* Mostrar mensaje si el token no está disponible por fecha */}
          {!tokenAvailable && (
            <div className="mb-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 text-center">
              <div className="text-lg mb-1">📅 Token no disponible aún</div>
              <div className="text-sm opacity-80">
                Este token solo estará disponible a partir del {reservationDate ? new Date(reservationDate).toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit'
                }) : 'fecha de reserva'}
              </div>
            </div>
          )}
          
        </>
      )}

      {/* Información de estado */}
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-white/70">Estado:</span>
          <span className={`font-medium ${status === 'active' ? 'text-green-400' : status === 'redeemed' ? 'text-blue-400' : 'text-yellow-400'}`}>
            {status === 'active' && multiUse ? 'Disponible' : status}{multiUse && status !== 'active' ? ` (${used}/${max})` : ''}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/70">Vence:</span>
          <span className="font-medium text-yellow-300">{expiresAt ? (() => {
            const expiresAtLima = DateTime.fromJSDate(new Date(expiresAt)).setZone('America/Lima');
            return expiresAtLima.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' });
          })() : '–'}</span>
        </div>
        
        {isHost && hostArrivedAt && (
          <div className="flex justify-between items-center">
            <span className="text-white/70">Llegada:</span>
            <span className="text-emerald-300 font-medium">{hostArrivedAt.toLocaleTimeString()}</span>
          </div>
        )}
        
        {!isHost && (
          <div className="flex justify-between items-center">
            <span className="text-white/70">Invitados:</span>
            <span className="text-blue-300 font-medium">{guestArrivals} ingresos</span>
          </div>
        )}
        
        {!isHost && lastGuestArrival && (
          <div className="flex justify-between items-center">
            <span className="text-white/70">Último ingreso:</span>
            <span className="text-green-300 font-medium text-sm">
              {new Date(lastGuestArrival).toLocaleString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
              })}
            </span>
          </div>
        )}
      </div>

      {err && <div className="mt-3 text-sm text-red-300 bg-red-900/20 border border-red-800/40 rounded p-2">{err}</div>}
      
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-emerald-600/40 rounded-lg p-6 w-full max-w-sm text-center space-y-4">
            <h2 className="text-lg font-semibold text-emerald-300">Registro exitoso</h2>
            <p className="text-sm text-slate-200 leading-relaxed">{modalMessage}</p>
            <div className="flex flex-col gap-2">
              <button onClick={()=>{ window.location.href = isHost ? '/u/scanner' : '/admin/scanner'; }} className="px-4 py-2 rounded bg-emerald-600 text-sm font-semibold">Volver al panel</button>
              <button onClick={()=>{ setShowModal(false); }} className="px-4 py-2 rounded bg-slate-700 text-xs">Cerrar</button>
            </div>
            <div className="text-[10px] opacity-50">Para otro ingreso escanea un nuevo código.</div>
          </div>
        </div>
      )}
    </div>
  );
}
