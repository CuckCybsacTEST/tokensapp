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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Invitación no válida</h1>
        <p className="text-sm opacity-80 mb-4">Puede que el código haya expirado o sea incorrecto.</p>
        <a href="/marketing" className="rounded px-4 py-2 font-semibold bg-violet-600">Ir al inicio</a>
      </div>
    );
  }
  const token = data.token;
  const isPublic = data.public;
  const isStaff = !isPublic; // by construction of API
  const firstName = isPublic ? token.celebrantName : token.celebrantName.split(/\s+/)[0];
  return (
    <div className="min-h-screen flex flex-col px-4 py-8 items-center bg-black text-white">
      <div className="w-full max-w-xl">
        <a href="/marketing" className="inline-block text-xs opacity-70 hover:opacity-100">← Volver</a>
        <h1 className="mt-3 text-3xl font-extrabold">Acceso {token.isHost ? 'Cumpleañero' : 'Invitado'}</h1>
        <p className="mt-1 opacity-80 text-sm">Fiesta de {firstName}{!isPublic && token.celebrantName !== firstName ? ` (${token.celebrantName})` : ''}</p>
        {!isPublic && (
          <p className="mt-0.5 opacity-60 text-xs">Pack: {token.packName || '–'} {token.packBottle ? `· 🍾 ${token.packBottle}` : ''} · Límite invitados: {token.packGuestLimit || '—'}</p>
        )}
        {isPublic && (
          <div className="mt-4 rounded border border-white/10 bg-white/5 p-4 text-sm leading-relaxed">
            {data.message}
          </div>
        )}
        {!isPublic && data.reservation && (
          <div className="mt-4 grid gap-2 text-sm bg-white/5 p-4 rounded border border-white/10">
            <div><span className="font-semibold">Cumpleañero:</span> {token.celebrantName}</div>
            <div className="grid grid-cols-2 gap-2 text-xs opacity-80">
              <div>DNI: {data.reservation.documento}</div>
              <div>Tel: {data.reservation.phone}</div>
              <div>Fecha: {data.reservation.date}</div>
              <div>Hora: {data.reservation.timeSlot}</div>
            </div>
            <div className="text-xs opacity-70">Reserva: {data.reservation.reservationId} · Estado: {data.reservation.statusReservation}</div>
          </div>
        )}
        <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-xs">
          <div className="font-semibold mb-1">Estado del token</div>
          <div>Código: <span className="font-mono">{token.code}</span></div>
          <div>Tipo: {token.isHost ? 'Host' : 'Invitado'} {token.multiUse ? `(multi-uso ${token.multiUse.used}/${token.multiUse.max})` : '(1 uso)'}</div>
          <div>Estado: {token.status}</div>
          <div>Vence: {token.expiresAt ? new Date(token.expiresAt).toLocaleString() : '–'}</div>
          {isPublic && token.multiUse && (
            <div className="mt-1 opacity-70">Capacidad del código: hasta {token.multiUse.max} invitados.</div>
          )}
            {isStaff && (
              <StaffValidateControls code={token.code} isHost={token.isHost} multiUse={token.multiUse} initialStatus={token.status} />
            )}
        </div>
        <div className="mt-8 text-center text-xs opacity-50">© 2025 QR Platform</div>
      </div>
    </div>
  );
}
  import StaffValidateControls from './StaffValidateControls';
