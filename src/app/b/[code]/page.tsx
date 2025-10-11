import React from 'react';
import { cookies } from 'next/headers';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

async function fetchToken(code: string, cookieHeader: string | undefined) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/birthdays/invite/${encodeURIComponent(code)}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: 'no-store'
  });
  const j = await res.json().catch(()=>({}));
  return { ok: res.ok, data: j };
}

export default async function BirthdayInvitePage({ params }: { params: { code: string } }) {
  const rawCookie = cookies().toString();
  const code = params.code;
  const { ok, data } = await fetchToken(code, rawCookie);
  if (!ok) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-[#0E0606] to-[#07070C] text-white">
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight drop-shadow-lg">Invitación no válida</h1>
        <p className="text-base opacity-80 mb-4">Puede que el código haya expirado o sea incorrecto.</p>
        <a href="/marketing" className="rounded-lg px-5 py-2 font-semibold bg-[#FF4D2E] text-white shadow-lg hover:bg-[#FF7A3C] transition">Ir al inicio</a>
      </div>
    );
  }
  const token = data.token;
  const isPublic = data.public;
  const isStaff = !isPublic; // by construction of API
  const firstName = isPublic ? token.celebrantName : token.celebrantName.split(/\s+/)[0];
  return (
    <div className={`min-h-screen flex flex-col px-4 py-8 items-center justify-center bg-gradient-to-b from-[#0E0606] to-[#07070C] text-white`}>
      <div className="w-full max-w-xl mx-auto rounded-2xl shadow-2xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 p-6 md:p-10 flex flex-col items-center">
        <a href="/marketing" className="inline-block text-xs opacity-70 hover:opacity-100 mb-2 text-white/70 hover:text-white">← Volver</a>
        <h1 className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg text-center text-[#FF4D2E]">{token.isHost ? 'Acceso Cumpleañero' : 'Acceso Invitado'}</h1>
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
            <StaffValidateControls code={token.code} isHost={token.isHost} multiUse={token.multiUse} initialStatus={token.status} expiresAt={token.expiresAt} />
          </div>
        )}
        
        <div className="mt-8 text-center text-xs opacity-70 text-white/50">© 2025 Go Lounge!</div>
      </div>
    </div>
  );
}
  import StaffValidateControls from './StaffValidateControls';
