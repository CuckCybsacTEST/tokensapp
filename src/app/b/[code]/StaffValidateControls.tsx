"use client";
import React, { useEffect, useState, useTransition } from 'react';

export default function StaffValidateControls({ code, isHost, multiUse, initialStatus, expiresAt, initialGuestArrivals = 0, lastGuestArrivalAt }: { code:string; isHost:boolean; multiUse: any; initialStatus: string; expiresAt: string | null; initialGuestArrivals?: number; lastGuestArrivalAt?: string | null }) {
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

  // Marcar la “sesión de lectura” del QR al montar: si se recarga la página se considera un nuevo escaneo.
  useEffect(()=>{
    // Podemos guardar un flag temporal en sessionStorage con el código.
    try { sessionStorage.setItem(`scan:${code}`, Date.now().toString()); } catch {}
  }, [code]);

  function validate() {
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
  const disableButton = pending || exhausted || already || consumedOnce;
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg">
      <div className="text-sm font-semibold text-[#FF4D2E] mb-3 text-center">Validación de Ingreso</div>
      
      {/* Botón principal prominente */}
      <div className="flex justify-center mb-4">
        <button 
          onClick={validate} 
          disabled={disableButton} 
          className={`px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
            disableButton 
              ? 'bg-gray-600 cursor-not-allowed opacity-50' 
              : 'bg-[#FF4D2E] hover:bg-[#FF7A3C] active:scale-95 shadow-lg hover:shadow-xl'
          } text-white`}
        >
          {pending ? 'Validando…' : isHost ? (hostArrivedAt ? '✅ Llegada Registrada' : '🚪 Marcar Llegada') : exhausted ? '❌ Agotado' : consumedOnce ? '✅ Registrado' : '✅ Registrar Ingreso'}
        </button>
      </div>

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
          <span className="font-medium text-yellow-300">{expiresAt ? new Date(expiresAt).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '–'}</span>
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
