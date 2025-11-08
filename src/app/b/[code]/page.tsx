"use client";
import React, { useState, useEffect, useTransition } from 'react';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { DateTime } from 'luxon';

// Componente wrapper para manejar el botón fuera del contenedor
function StaffControlsWrapper({ 
  code, 
  isHost, 
  multiUse, 
  initialStatus, 
  expiresAt, 
  initialGuestArrivals = 0, 
  lastGuestArrivalAt, 
  reservationDate, 
  reservationStatus 
}: {
  code: string;
  isHost: boolean;
  multiUse: any;
  initialStatus: string;
  expiresAt: string | null;
  initialGuestArrivals?: number;
  lastGuestArrivalAt?: string | null;
  reservationDate?: string;
  reservationStatus?: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [used, setUsed] = useState(multiUse?.used ?? (initialStatus === 'redeemed' ? 1 : 0));
  const [max, setMax] = useState(multiUse?.max ?? (multiUse ? 0 : 1));
  const [hostArrivedAt, setHostArrivedAt] = useState<Date | null>(null);
  const [guestArrivals, setGuestArrivals] = useState<number>(initialGuestArrivals);
  const [lastGuestArrival, setLastGuestArrival] = useState<string | null>(lastGuestArrivalAt || null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [consumedOnce, setConsumedOnce] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Determinar si el token está disponible basado en la fecha de reserva
  const isTokenAvailable = () => {
    if (!reservationDate) return true;
    const nowLima = DateTime.now().setZone('America/Lima').startOf('day');
    const reservationLima = DateTime.fromISO(reservationDate).setZone('America/Lima').startOf('day');
    return nowLima >= reservationLima;
  };

  const tokenAvailable = isTokenAvailable();

  useEffect(() => {
    try { sessionStorage.setItem(`scan:${code}`, Date.now().toString()); } catch {}
  }, [code]);

  function validate() {
    console.log('[STAFF] Attempting validation for code:', code, 'consumedOnce:', consumedOnce);
    setErr(null);
    start(async () => {
      try {
        if (consumedOnce) {
          console.log('[STAFF] Validation blocked - already consumed once');
          return;
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
  const disableButton = pending || exhausted || already || consumedOnce || !tokenAvailable;

  return (
    <>
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
      
      {/* Botón de registrar ingreso - fuera del contenedor */}
      {tokenAvailable && (
        <div className="flex justify-center mt-4">
          <button 
            onClick={validate} 
            disabled={disableButton} 
            className={`px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 whitespace-nowrap ${
              disableButton 
                ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                : 'bg-[#FF4D2E] hover:bg-[#FF7A3C] active:scale-95 shadow-lg hover:shadow-xl'
            } text-white`}
          >
            {pending ? 'Validando…' : isHost ? (hostArrivedAt ? '✅ Llegada Registrada' : '🚪 Marcar Llegada') : exhausted ? '❌ Agotado' : consumedOnce ? '✅ Registrado' : '✅ Registrar Ingreso'}
          </button>
        </div>
      )}
    </>
  );
}

async function fetchToken(code: string, cookieHeader: string | undefined) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
  const res = await fetch(`${baseUrl}/api/birthdays/invite/${encodeURIComponent(code)}`, {
    cache: 'no-store',
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  const j = await res.json().catch(()=>({}));
  return { ok: res.ok, data: j };
}

export default function BirthdayInvitePage({ params }: { params: { code: string } }) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentData, setCurrentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const rawCookie = document.cookie;
      console.log('[CLIENT] Fetching data for code:', params.code);
      const { ok, data } = await fetchToken(params.code, rawCookie);
      console.log('[CLIENT] Fetch result:', { ok, data, hostArrivedAt: data?.hostArrivedAt || data?.reservation?.hostArrivedAt });
      if (ok) {
        setCurrentData(data);
        setLastUpdated(new Date());
        console.log('[CLIENT] Data updated successfully');
      } else {
        setError('No se pudo cargar la información');
      }
    } catch (err) {
      console.error('[CLIENT] Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-[#0E0606] to-[#07070C] text-white">
        <div className="text-2xl mb-4">Cargando...</div>
      </div>
    );
  }

  if (error || !currentData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-[#0E0606] to-[#07070C] text-white">
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight drop-shadow-lg">Error</h1>
        <p className="text-base opacity-80 mb-4">{error || 'No se pudo cargar la invitación'}</p>
      </div>
    );
  }

  const data = currentData;
  const token = data.token;
  const isPublic = data.public;
  const isStaff = !isPublic;
  const firstName = isPublic ? token.celebrantName : token.celebrantName.split(/\s+/)[0];
  // Get hostArrivedAt from the correct location based on user type
  const hostArrivedAt = isPublic ? data.hostArrivedAt : data.reservation?.hostArrivedAt;

  // Verificar si la reserva está cancelada (prioridad alta en UI)
  const isReservationCanceled = data.reservation?.statusReservation === 'canceled' || data.reservation?.statusReservation === 'cancelled';
  if (isReservationCanceled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-[#2d1a1a] to-[#07070C] text-white">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight drop-shadow-lg text-[#FF4D2E]">Reserva Cancelada</h1>
        <p className="text-base opacity-80 mb-4">Esta reserva ha sido cancelada y ya no es válida.</p>
        <div className="text-sm opacity-70 mb-2">Si crees que esto es un error, contacta al soporte.</div>
        <a href={isPublic ? "/marketing" : (data.isAdmin ? "/admin/scanner" : "/u/scanner")} className="inline-block text-xs opacity-70 hover:opacity-100 mt-4 text-white/70 hover:text-white">← Volver</a>
      </div>
    );
  }

  // Detectar expiración del token
  const nowLima = DateTime.now().setZone('America/Lima');
  const expiresAtLima = DateTime.fromISO(token.expiresAt).setZone('America/Lima');
  const isExpired = nowLima > expiresAtLima;

  // Determinar si el token está disponible basado en la fecha de reserva
  const isTokenAvailable = () => {
    if (!isStaff || !data.reservation?.date) return true; // Vista pública siempre muestra, staff necesita fecha de reserva
    const reservationLima = DateTime.fromISO(data.reservation.date).setZone('America/Lima').startOf('day');
    return nowLima.startOf('day') >= reservationLima;
  };
  const tokenAvailable = isTokenAvailable();

  if (isExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-[#2d0a0a] to-[#07070C] text-white">
        <div className="text-5xl mb-4">⏰</div>
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight drop-shadow-lg text-[#FF4D2E]">Token expirado</h1>
        <p className="text-base opacity-80 mb-4">Este pase ya expiró y no es válido para ingresar.</p>
        <div className="text-sm opacity-70 mb-2">Expiró el: {expiresAtLima.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' })}</div>
        <a href={isPublic ? "/u" : (data.isAdmin ? "/admin/scanner" : "/u/scanner")} className="inline-block text-xs opacity-70 hover:opacity-100 mt-4 text-white/70 hover:text-white">← Volver</a>
      </div>
    );
  }

  if (!tokenAvailable) {
    const reservationDate = data.reservation?.date
      ? DateTime.fromISO(data.reservation.date, { zone: 'America/Lima' })
      : null;
    const expiresAtLima = DateTime.fromISO(token.expiresAt).setZone('America/Lima');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-[#0a2d2d] to-[#07070C] text-white">
        <div className="text-5xl mb-4">🕒</div>
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight drop-shadow-lg text-[#2ECFFF]">Token aún no válido</h1>
        <p className="text-base opacity-80 mb-4">Este pase solo será válido el día de la reserva.</p>
        <div className="text-sm opacity-70 mb-2">Reserva para: {reservationDate ? reservationDate.toLocaleString({ day: '2-digit', month: '2-digit', year: 'numeric' }, { locale: 'es-ES' }) : 'Fecha desconocida'}</div>
        <div className="text-sm opacity-70 mb-2">Expira el: {expiresAtLima.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' })}</div>
        <a href={isPublic ? "/u" : (data.isAdmin ? "/admin/scanner" : "/u/scanner")} className="inline-block text-xs opacity-70 hover:opacity-100 mt-4 text-white/70 hover:text-white">← Volver</a>
      </div>
    );
  }


  return (
    <div className={`min-h-screen flex flex-col px-4 py-8 items-center justify-center bg-gradient-to-b from-[#0E0606] to-[#07070C] text-white`}>
      <div className="w-full max-w-xl mx-auto rounded-2xl shadow-2xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 p-6 md:p-10 flex flex-col items-center">
        <a
          href={
            isPublic
              ? "/marketing"
              : (data.isAdmin ? "/admin/scanner" : "/u/scanner")
          }
          className="inline-block text-xs opacity-70 hover:opacity-100 mb-2 text-white/70 hover:text-white"
        >← Volver</a>
        
        <h1 className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg text-center text-[#FF4D2E]">{token.isHost ? 'Acceso Cumpleañero' : 'Acceso Invitado'}</h1>

        {/* Información adicional de expiración solo para sesión pública */}
        {isPublic && (
          <div className="text-sm opacity-70 mt-2 mb-2 text-center">
            <div>
              ⏰ Expira: {(() => {
                const expiresAtLima = DateTime.fromJSDate(new Date(token.expiresAt)).setZone('America/Lima');
                return expiresAtLima.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' });
              })()}
            </div>
          </div>
        )}
        {token.isHost && (
          <p className="mt-2 text-lg md:text-xl font-medium text-center text-white/80">Pase válido solo para{isPublic ? ` ${token.celebrantName}` : '...'}</p>
        )}
        {!token.isHost && (
          <p className="mt-2 text-lg md:text-xl font-medium text-center text-white/80">este es un pase para la fiesta de</p>
        )}
        
        {isPublic && token.isHost && (
          <div className="mt-4 rounded-xl border border-white/20 bg-white/5 p-4 text-base leading-relaxed text-white/90 shadow-lg">
            Muestra este código al ingresar y disfruta de tu noche.
          </div>
        )}
        
        {isPublic && !token.isHost && (
          <div className="mt-4 rounded-xl border border-white/20 bg-white/5 p-4 text-base leading-relaxed text-white/90 shadow-lg">
            {typeof data.message === 'string' 
              ? data.message
                  .replace(/^Esta es la fiesta de [^.]+\. /, '')
                  .replace(/Estás invitad@ a la fiesta de [^.]+\.?/i, '')
                  .trim()
              : data.message}
          </div>
        )}
        
        {/* Mostrar mensaje si el token no está disponible por fecha - Vista pública */}
        {isPublic && !tokenAvailable && (
          <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center text-yellow-100 shadow-lg">
            <div className="text-lg mb-2">📅 Token no disponible aún</div>
            <div className="text-sm opacity-80 mb-2">
              Este token estará disponible a partir del {data.reservation?.date ? new Date(data.reservation.date).toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit'
              }) : 'fecha de la reserva'}
            </div>
            <div className="text-xs opacity-70">
              Vuelve en la fecha indicada para poder usar este código.
            </div>
          </div>
        )}
        
        {/* Mostrar información de llegada solo si el token está disponible - Vista pública */}
        {isPublic && tokenAvailable && !token.isHost && (
          <div className={`mt-4 rounded-xl border p-4 text-center font-semibold shadow-lg ${
            hostArrivedAt 
              ? 'border-green-500/30 bg-green-500/10 text-green-100' 
              : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100'
          }`}>
            {hostArrivedAt ? (
              <>
                <div className="text-lg mb-1">🎉 ¡El cumpleañero ya llegó!</div>
                <div className="text-sm opacity-80 mb-2">Puedes dirigirte al lounge</div>
                {data.reservation?.guestArrivals > 0 && (
                  <div className="text-sm opacity-90 font-medium">
                    {data.reservation.guestArrivals} {data.reservation.guestArrivals === 1 ? 'invitado ya llegó' : 'invitados ya llegaron'}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                  <span className="text-lg">⏳</span>
                  <span className="text-sm font-medium">Esperando cumpleañero</span>
                </div>
              </>
            )}
          </div>
        )}
        
        {!isPublic && data.reservation && (
          <div className="w-full mt-4 grid gap-3 text-base p-4 rounded-xl border shadow-lg bg-white/5 border-white/10 text-white/90">
            {/* Información de identificación - Lo más importante para el personal */}
            <div className="text-center pb-2 border-b border-white/10">
              <div className="text-xl font-bold text-[#FF4D2E]">{token.celebrantName}</div>
              <div className="text-sm opacity-75">Cumpleañero</div>
            </div>

            {/* Información destacada de fecha y hora - Dentro del contenedor del cumpleañero */}
            <div className="text-center">
              <div className="inline-flex flex-row items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">📅</span>
                  <div className="text-left">
                    <div className="text-xs font-medium text-white/70 uppercase tracking-wide">Fecha</div>
                    <div className="text-base sm:text-lg font-bold text-white">
                      {(() => {
                        const reservationDate = data.reservation?.date
                          ? DateTime.fromISO(data.reservation.date, { zone: 'America/Lima' })
                          : null;
                        if (reservationDate) {
                          return reservationDate.toLocaleString({ day: '2-digit', month: 'short' }, { locale: 'es-ES' }).toUpperCase().replace('.', '');
                        }
                        return 'Fecha no disponible';
                      })()}
                    </div>
                  </div>
                </div>
                <div className="block w-px h-8 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">⏰</span>
                  <div className="text-left">
                    <div className="text-xs font-medium text-white/70 uppercase tracking-wide">Hora</div>
                    <div className="text-base sm:text-lg font-bold text-white">
                      {data.reservation?.timeSlot || 'Hora no disponible'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Información del pack y botella - Destacado visualmente */}
            <div className="text-center">
              <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-[#FF4D2E]/20 to-[#FF8A65]/20 backdrop-blur-sm rounded-xl border border-[#FF4D2E]/30 shadow-lg">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-xl">🎁</span>
                  <div className="text-left">
                    <div className="text-xs font-medium text-[#FF4D2E]/80 uppercase tracking-wide">Pack</div>
                    <div className="text-sm sm:text-base font-bold text-[#FF4D2E]">
                      {data.token?.packName || 'No disponible'}
                    </div>
                  </div>
                </div>
                <div className="block w-px h-6 sm:h-8 bg-[#FF4D2E]/30"></div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-xl">🍾</span>
                  <div className="text-left">
                    <div className="text-xs font-medium text-[#FF4D2E]/80 uppercase tracking-wide">Botella</div>
                    <div className="text-sm sm:text-base font-bold text-[#FF4D2E]">
                      {data.token?.packBottle || 'No disponible'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Información de invitados - Cantidad planificada */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#4CAF50]/20 to-[#66BB6A]/20 backdrop-blur-sm rounded-xl border border-[#4CAF50]/30 shadow-lg">
                <span className="text-lg">👥</span>
                <div className="text-left">
                  <div className="text-xs font-medium text-[#4CAF50]/80 uppercase tracking-wide">Invitados</div>
                  <div className="text-sm font-bold text-[#4CAF50]">
                    {data.token?.guestsPlanned ? `${data.token.guestsPlanned} planificados` : 'No especificado'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Datos de identificación - Solo mostrar para host */}
            {token.isHost && (
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-white/80">DNI:</span>
                  <span className="font-mono text-lg">{data.reservation.documento}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-white/80">Teléfono:</span>
                  <span className="font-mono">{data.reservation.phone}</span>
                </div>
              </div>
            )}
            
            {/* Estado de llegada del anfitrión - Mostrar solo para invitados, no para el host */}
            {!token.isHost && (
              <div className={`mt-3 p-3 rounded-lg border text-center font-medium ${
                hostArrivedAt 
                  ? 'border-green-500/30 bg-green-500/10 text-green-100' 
                  : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100'
              }`}>
                {hostArrivedAt ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">✅</span>
                    <span>Cumpleañero presente</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">⏳</span>
                    <span>Esperando cumpleañero</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Estado e ID de reserva - Solo mostrar para host */}
            {token.isHost && (
              <div className="text-xs opacity-70 pt-1 border-t border-white/10">
                <div>Reserva: <span className="font-mono">{data.reservation.reservationId}</span></div>
                <div>Estado: <span className={`font-medium ${data.reservation.statusReservation === 'confirmed' ? 'text-green-400' : data.reservation.statusReservation === 'canceled' ? 'text-red-400' : 'text-yellow-400'}`}>{data.reservation.statusReservation}</span></div>
              </div>
            )}
          </div>
        )}
        

        
        {isStaff && (
          <div className="mt-4 w-full">
            <StaffControlsWrapper 
              code={token.code} 
              isHost={token.isHost} 
              multiUse={token.multiUse} 
              initialStatus={token.status} 
              expiresAt={token.expiresAt}
              initialGuestArrivals={data.reservation?.guestArrivals || 0}
              lastGuestArrivalAt={data.reservation?.lastGuestArrivalAt}
              reservationDate={data.reservation?.date}
              reservationStatus={data.reservation?.statusReservation}
            />
          </div>
        )}
        
        <div className="mt-8 text-center text-xs opacity-70 text-white/50">© 2025 Go Lounge!</div>
      </div>
    </div>
  );
}
