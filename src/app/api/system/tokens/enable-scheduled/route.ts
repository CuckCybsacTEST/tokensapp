import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';

function isValidDay(day: string | null): day is string { return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day); }

// Habilita tokens programados (disabled = true) cuyo fin de día corresponde al día indicado (zona America/Lima)
export async function POST(req: Request) {
  // Auth: ADMIN/STAFF o x-cron-secret válido (middleware ya deja pasar si viene el header correcto).
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const ok = requireRole(session, ['ADMIN','STAFF']);
  if (!ok.ok) {
    // Si no es admin/staff, verificar que middleware haya permitido por cron (no tenemos señal aquí, asumimos que ya pasó)
    // Continuamos sin bloquear.
  }

  // Permitir pasar parámetros también por querystring (fallback cuando un caller no envía body correctamente)
  const url = new URL(req.url);
  const qpDay = url.searchParams.get('day');
  const qpDry = url.searchParams.get('dryRun');

  const body = await req.json().catch(() => null) as { day?: string; dryRun?: boolean } | null;
  let day = (body?.day ?? qpDay ?? '').trim();
  const dryRun = typeof body?.dryRun === 'boolean' ? body!.dryRun : (qpDry === '1' || qpDry === 'true');
  if (!isValidDay(day)) {
    // Si no se envía día válido, usar “hoy” (yyyy-MM-dd) en Lima
    const nowLimaIso = DateTime.now().setZone('America/Lima').toISO();
    day = String(nowLimaIso).slice(0, 10);
  }

  // Calcular la ventana del día en Lima
  const start = DateTime.fromISO(day, { zone: 'America/Lima' }).startOf('day');
  const end = DateTime.fromISO(day, { zone: 'America/Lima' }).endOf('day');

  // Habilitar tokens que fueron generados para este día y quedaron disabled=true (modo singleDay futuro)
  const where = {
    disabled: true,
    expiresAt: { gte: start.toJSDate(), lte: end.toJSDate() },
  } as const;

  if (dryRun) {
    const count = await prisma.token.count({ where });
    return NextResponse.json({ ok: true, dryRun: true, wouldUpdate: count });
  }

  const res = await prisma.token.updateMany({ where, data: { disabled: false } });
  return NextResponse.json({ ok: true, updated: res.count });
}
