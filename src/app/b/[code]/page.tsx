"use client";
import React, { useState, useEffect } from 'react';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

async function fetchToken(code: string, cookieHeader: string | undefined) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/birthdays/invite/${encodeURIComponent(code)}`, {
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

  console.log('[CLIENT] Rendering with data:', {
    code: params.code,
    isPublic,
    isStaff,
    hostArrivedAt: hostArrivedAt,
    tokenStatus: token.status,
    tokenKind: token.kind,
    hasHostArrivedAt: !!hostArrivedAt
  });

  return (
    <div className={`min-h-screen flex flex-col px-4 py-8 items-center justify-center bg-gradient-to-b from-[#0E0606] to-[#07070C] text-white`}>
      <div className="w-full max-w-xl mx-auto rounded-2xl shadow-2xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 p-6 md:p-10 flex flex-col items-center">
        <a href="/marketing" className="inline-block text-xs opacity-70 hover:opacity-100 mb-2 text-white/70 hover:text-white">← Volver</a>
        
        {/* Botón de actualizar estado */}
        <div className="w-full flex justify-end mb-4">
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
          >
            {isRefreshing ? '🔄' : '↻'} Actualizar
          </button>
        </div>
        
        <h1 className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg text-center text-[#FF4D2E]">{token.isHost ? 'Acceso Cumpleañero' : 'Acceso Invitado'}</h1>
        
        {/* Indicador de última actualización */}
        <div className="text-xs opacity-60 mt-1 mb-2">
          Última actualización: {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
        {token.isHost && (
          <p className="mt-2 text-lg md:text-xl font-medium text-center text-white/80">Pase válido solo para{isPublic ? ` ${token.celebrantName}` : '...'}</p>
        )}
        {!token.isHost && (
          <p className="mt-2 text-lg md:text-xl font-medium text-center text-white/80">Este es un pase para la fiesta de {token.celebrantName}</p>
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
        
        {isPublic && !token.isHost && (
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
                <div className="text-lg mb-1">⏳ Esperando llegada del cumpleañero</div>
                <div className="text-sm opacity-80">Te avisaremos cuando llegue</div>
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
                    <span>Esperando llegada del cumpleañero</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Detalles operativos - Mostrar para todos */}
            <div className={`grid grid-cols-2 gap-2 ${token.isHost ? 'pt-2 border-t border-white/10' : 'pt-2'}`}>
              <div>
                <span className="font-medium text-white/80">Fecha:</span>
                <div className="text-sm">{data.reservation.date}</div>
              </div>
              <div>
                <span className="font-medium text-white/80">Hora:</span>
                <div className="text-sm">{data.reservation.timeSlot}</div>
              </div>
            </div>
            
            {/* Estado e ID de reserva - Solo mostrar para host */}
            {token.isHost && (
              <div className="text-xs opacity-70 pt-1 border-t border-white/10">
                <div>Reserva: <span className="font-mono">{data.reservation.reservationId}</span></div>
                <div>Estado: <span className={`font-medium ${data.reservation.statusReservation === 'confirmed' ? 'text-green-400' : data.reservation.statusReservation === 'cancelled' ? 'text-red-400' : 'text-yellow-400'}`}>{data.reservation.statusReservation}</span></div>
              </div>
            )}
          </div>
        )}
        
        {!isPublic && (
          <p className="mt-3 opacity-80 text-sm text-center text-white/70">Pack: {token.packName || '–'} {token.packBottle ? `· 🍾 ${token.packBottle}` : ''}</p>
        )}
        
        {isStaff && (
          <div className="mt-4 w-full">
            <StaffValidateControls 
              code={token.code} 
              isHost={token.isHost} 
              multiUse={token.multiUse} 
              initialStatus={token.status} 
              expiresAt={token.expiresAt}
              initialGuestArrivals={data.reservation?.guestArrivals || 0}
              lastGuestArrivalAt={data.reservation?.lastGuestArrivalAt}
            />
          </div>
        )}
        
        <div className="mt-8 text-center text-xs opacity-70 text-white/50">© 2025 Go Lounge!</div>
      </div>
    </div>
  );
}
  import StaffValidateControls from './StaffValidateControls';
