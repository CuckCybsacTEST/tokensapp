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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-br from-orange-600 via-orange-400 to-yellow-300 text-black">
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight drop-shadow-lg">Invitación no válida</h1>
        <p className="text-base opacity-80 mb-4">Puede que el código haya expirado o sea incorrecto.</p>
        <a href="/marketing" className="rounded-lg px-5 py-2 font-semibold bg-black text-orange-300 shadow-lg hover:bg-orange-700 transition">Ir al inicio</a>
      </div>
    );
  }
  const token = data.token;
  const isPublic = data.public;
  const isStaff = !isPublic; // by construction of API
  const firstName = isPublic ? token.celebrantName : token.celebrantName.split(/\s+/)[0];
  return (
    <div className="min-h-screen flex flex-col px-4 py-8 items-center justify-center bg-gradient-to-br from-orange-600 via-orange-400 to-yellow-300 text-black">
      <div className="w-full max-w-xl mx-auto rounded-2xl shadow-2xl bg-black/80 p-6 md:p-10 flex flex-col items-center">
        <a href="/marketing" className="inline-block text-xs opacity-70 hover:opacity-100 mb-2 text-orange-300">← Volver</a>
        <h1 className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight text-orange-300 drop-shadow-lg text-center">{token.isHost ? 'Acceso Cumpleañero' : 'Acceso Invitado'}</h1>
        <p className="mt-2 text-lg md:text-xl font-semibold text-orange-200 text-center">Fiesta de {firstName}{!isPublic && token.celebrantName !== firstName ? ` (${token.celebrantName})` : ''}</p>
        {!isPublic && (
          <p className="mt-1 opacity-80 text-sm text-orange-100 text-center">Pack: {token.packName || '–'} {token.packBottle ? `· 🍾 ${token.packBottle}` : ''} · Límite invitados: {token.packGuestLimit || '—'}</p>
        )}
        {isPublic && (
          <div className="mt-4 rounded-xl border border-orange-400/30 bg-orange-100/10 p-4 text-base leading-relaxed text-orange-100 shadow-lg">
            {typeof data.message === 'string' ? data.message.replace(/^Esta es la fiesta de [^.]+\. /, '') : data.message}
          </div>
        )}
        {!isPublic && data.reservation && (
          <div className="mt-4 grid gap-2 text-base bg-orange-100/10 p-4 rounded-xl border border-orange-400/30 shadow-lg">
            <div><span className="font-semibold text-orange-200">Cumpleañero:</span> {token.celebrantName}</div>
            <div className="grid grid-cols-2 gap-2 text-xs opacity-80">
              <div>DNI: {data.reservation.documento}</div>
              <div>Tel: {data.reservation.phone}</div>
              <div>Fecha: {data.reservation.date}</div>
              <div>Hora: {data.reservation.timeSlot}</div>
            </div>
            <div className="text-xs opacity-70">Reserva: {data.reservation.reservationId} · Estado: {data.reservation.statusReservation}</div>
          </div>
        )}
        <div className="mt-6 rounded-xl border border-orange-400/30 bg-orange-100/10 p-4 text-base shadow-lg w-full">
          <div className="font-semibold mb-2 text-orange-200 text-lg">Estado del token</div>
          <div className="mb-1">Código: <span className="font-mono text-orange-300 text-lg">{token.code}</span></div>
          {/* Oculta el tipo */}
          {/* <div className="mb-1">Tipo: <span className="font-semibold">{token.isHost ? 'Host' : 'Invitado'}</span> {token.multiUse ? <span className="text-xs">(multi-uso {token.multiUse.used}/{token.multiUse.max})</span> : <span className="text-xs">(1 uso)</span>}</div> */}
          <div className="mb-1">Estado: <span className="font-semibold">{token.status}</span></div>
          <div className="mb-1">Vence: <span className="font-semibold">{token.expiresAt ? new Date(token.expiresAt).toLocaleString() : '–'}</span></div>
          {isPublic && token.multiUse && (
            <div className="mt-1 opacity-80">1 cumpleañero</div>
          )}
          {isStaff && (
            <div className="mt-2">
              <StaffValidateControls code={token.code} isHost={token.isHost} multiUse={token.multiUse} initialStatus={token.status} />
            </div>
          )}
        </div>
        <div className="mt-8 text-center text-xs opacity-70 text-orange-200">© 2025 Go Lounge!</div>
      </div>
    </div>
  );
}
  import StaffValidateControls from './StaffValidateControls';
