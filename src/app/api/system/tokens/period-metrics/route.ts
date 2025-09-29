export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { verifyUserSessionCookie } from '@/lib/auth-user';
import { rangeBusinessDays, type Period } from '@/lib/date';

// Esta ruta usa encabezados/cookies para auth dual -> forzar dinámica para evitar intento de prerender
export const dynamic = 'force-dynamic';

/*
GET /api/system/tokens/period-metrics?period=today|yesterday|this_week|last_week|this_month|last_month
Optional custom: &period=custom&start=YYYY-MM-DD&end=YYYY-MM-DD (ADMIN/STAF only)  // not exposed in UI yet
Auth: ADMIN or STAFF (admin_session) OR STAFF (user_session)
Response: { ok, period, startDay, endDay, totals:{ total, redeemed, expired, active, delivered, revealed, disabled } }
*/

function error(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    // Dual auth path like other /api/system endpoints
    const rawAdmin = getSessionCookieFromRequest(req as any);
    const adminSession = await verifySessionCookie(rawAdmin).catch(()=>null);
    const rawUser = req.cookies.get('user_session')?.value;
    const userSession = await verifyUserSessionCookie(rawUser).catch(()=>null);
    const adminOk = adminSession && requireRole(adminSession, ['ADMIN','STAFF']).ok;
    const userOk = userSession && userSession.role === 'STAFF';
    if (!adminOk && !userOk) return error('FORBIDDEN', 'Forbidden', 403);

    const url = req.nextUrl;
  const periodParam = (url.searchParams.get('period') || 'today') as Period;
  const batchId = url.searchParams.get('batchId') || undefined;
    const start = url.searchParams.get('start') || undefined;
    const end = url.searchParams.get('end') || undefined;
  const allowed: Period[] = ['today','yesterday','day_before_yesterday','this_week','last_week','this_month','last_month','custom'];
    if (!allowed.includes(periodParam)) return error('INVALID_PERIOD', 'Invalid period');
    if (periodParam === 'custom' && (!start || !end)) return error('INVALID_CUSTOM', 'Custom period requires start & end');

  // Usamos business day para today / yesterday (alineado a asistencia con cutoff horario); resto (semana/mes) calendario UTC.
  const { start: rangeStart, end: rangeEnd, startDay, endDay, name } = rangeBusinessDays(periodParam, start, end);

    // Queries constrained by createdAt for tokens; expiration and redemption inside window
    const tokenBatchFilter = batchId ? { batchId } : {};
    // Nota: Para periodos 'today'/'yesterday' ya adaptamos el rango usando business day.
    // Ajuste: cuando se filtra por batchId queremos que 'total' refleje tokens de ese batch dentro del rango.
    // (Lógica actual ya lo hace). Se añade protección por si en algún entorno hay tokens con fecha fuera del rango pero businessDay dentro.
    const periodIsDaily = ['today','yesterday','day_before_yesterday'].includes(periodParam);
    // Conteo basado en functionalDate para daily: tokens cuyo batch.functionalDate está en rango
    // o tokens creados en rango cuyo batch.functionalDate es null.
    const functionalWhere = periodIsDaily ? {
      OR: [
        { batch: { functionalDate: { gte: rangeStart, lt: rangeEnd } } },
        { AND: [ { createdAt: { gte: rangeStart, lt: rangeEnd } }, { batch: { functionalDate: null } } ] }
      ]
    } : { createdAt: { gte: rangeStart, lt: rangeEnd } };
    const baseFilter = { ...tokenBatchFilter } as any;
    const [total, redeemed, delivered, revealed, disabled, expired, spins] = await Promise.all([
      prisma.token.count({ where: { ...baseFilter, ...functionalWhere } }),
      prisma.token.count({ where: { ...baseFilter, redeemedAt: { not: null, gte: rangeStart, lt: rangeEnd } } }),
      prisma.token.count({ where: { ...baseFilter, deliveredAt: { not: null, gte: rangeStart, lt: rangeEnd } } }),
      prisma.token.count({ where: { ...baseFilter, revealedAt: { not: null, gte: rangeStart, lt: rangeEnd } } }),
      prisma.token.count({ where: { ...baseFilter, disabled: true, createdAt: { gte: rangeStart, lt: rangeEnd } } }),
      prisma.token.count({ where: { ...baseFilter, expiresAt: { gte: rangeStart, lt: rangeEnd } } }),
      prisma.rouletteSpin.count({ where: { createdAt: { gte: rangeStart, lt: rangeEnd }, ...(batchId ? { session: { batchId } } : {}) } }),
    ]);
    const active = Math.max(0, total - redeemed - expired);
  return NextResponse.json({ ok: true, period: name, startDay, endDay, totals: { total, redeemed, expired, active, delivered, revealed, disabled }, spins, batchId: batchId || null });
  } catch (e: any) {
    console.error('period-metrics error', e);
    return error('INTERNAL', e?.message || 'internal error', 500);
  }
}
