import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';

function isValidDay(day: string | null): day is string { return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day); }

// Habilita tokens programados (disabled = true) cuyo fin de día corresponde al día indicado (zona America/Lima)
export async function POST(req: Request) {
  // Requerir ADMIN o STAFF
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const ok = requireRole(session, ['ADMIN','STAFF']);
  if (!ok.ok) return NextResponse.json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });

  const body = await req.json().catch(() => null) as { day?: string } | null;
  const day = (body?.day || '').trim();
  if (!isValidDay(day)) return NextResponse.json({ ok: false, code: 'INVALID_DAY' }, { status: 400 });

  // Calcular la ventana del día en Lima
  const start = DateTime.fromISO(day, { zone: 'America/Lima' }).startOf('day').toUTC();
  const end = DateTime.fromISO(day, { zone: 'America/Lima' }).endOf('day').toUTC();

  // Habilitar tokens que fueron generados para este día y quedaron disabled=true (modo singleDay futuro)
  const res = await prisma.token.updateMany({
    where: {
      disabled: true,
      expiresAt: { gte: start.toJSDate(), lte: end.toJSDate() },
    },
    data: { disabled: false },
  });
  return NextResponse.json({ ok: true, updated: res.count });
}
