import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { DateTime } from 'luxon';

export const dynamic = 'force-dynamic';

function isValidDay(day: string | null): day is string { return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day); }

// Elimina tokens de un día (America/Lima) que no hayan sido entregados ni redimidos y borra batches vacíos.
// Seguridad:
//  - Requiere ADMIN por sesión de admin
//  - O permite x-cron-secret válido (middleware ya filtra /api/system; aquí reforzamos ADMIN por seguridad)
export async function POST(req: Request) {
  // Auth estricto: solo ADMIN via cookie admin
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const auth = requireRole(session, ['ADMIN']);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN', message: 'ADMIN only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as { day?: string } | null;
  const day = (body?.day || '').trim();
  if (!isValidDay(day)) {
    return NextResponse.json({ ok: false, error: 'bad_request', message: 'day (YYYY-MM-DD) requerido' }, { status: 400 });
  }

  const start = DateTime.fromISO(day, { zone: 'America/Lima' }).startOf('day');
  const end = DateTime.fromISO(day, { zone: 'America/Lima' }).endOf('day');

  // Identificar tokens candidatos
  const tokens = await prisma.token.findMany({
    where: {
      expiresAt: { gte: start.toJSDate(), lte: end.toJSDate() },
      deliveredAt: null,
      redeemedAt: null,
    },
    select: { id: true, batchId: true },
  });

  if (tokens.length === 0) {
    return NextResponse.json({ ok: true, deletedTokens: 0, deletedBatches: 0, batchIdsAffected: [] });
  }

  const batchIds = Array.from(new Set(tokens.map(t => t.batchId)));

  const res = await prisma.$transaction(async (tx) => {
    const delTok = await tx.token.deleteMany({ where: { id: { in: tokens.map(t => t.id) } } });
    // Borrar batches que queden vacíos
    let deletedBatches = 0;
    for (const bid of batchIds) {
      const remaining = await tx.token.count({ where: { batchId: bid } });
      if (remaining === 0) {
        await tx.batch.delete({ where: { id: bid } });
        deletedBatches += 1;
      }
    }
    return { deletedTokens: delTok.count, deletedBatches };
  });

  return NextResponse.json({ ok: true, ...res, batchIdsAffected: batchIds });
}
