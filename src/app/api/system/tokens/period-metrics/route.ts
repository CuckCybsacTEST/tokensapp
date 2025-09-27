import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { verifyUserSessionCookie } from '@/lib/auth-user';
import { rangeBusinessDays, type Period } from '@/lib/date';

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
    const start = url.searchParams.get('start') || undefined;
    const end = url.searchParams.get('end') || undefined;
    const allowed: Period[] = ['today','yesterday','this_week','last_week','this_month','last_month','custom'];
    if (!allowed.includes(periodParam)) return error('INVALID_PERIOD', 'Invalid period');
    if (periodParam === 'custom' && (!start || !end)) return error('INVALID_CUSTOM', 'Custom period requires start & end');

  // Usamos business day para today / yesterday (alineado a asistencia con cutoff horario); resto (semana/mes) calendario UTC.
  const { start: rangeStart, end: rangeEnd, startDay, endDay, name } = rangeBusinessDays(periodParam, start, end);

    // Queries constrained by createdAt for tokens; expiration and redemption inside window
    const [total, redeemed, delivered, revealed, disabled, expired, spins] = await Promise.all([
      prisma.token.count({ where: { createdAt: { gte: rangeStart, lt: rangeEnd } } }),
      prisma.token.count({ where: { redeemedAt: { not: null, gte: rangeStart, lt: rangeEnd } } }),
      prisma.token.count({ where: { deliveredAt: { not: null, gte: rangeStart, lt: rangeEnd } } }),
      prisma.token.count({ where: { revealedAt: { not: null, gte: rangeStart, lt: rangeEnd } } }),
      prisma.token.count({ where: { disabled: true, createdAt: { gte: rangeStart, lt: rangeEnd } } }),
      prisma.token.count({ where: { expiresAt: { gte: rangeStart, lt: rangeEnd } } }),
      prisma.rouletteSpin.count({ where: { createdAt: { gte: rangeStart, lt: rangeEnd } } }),
    ]);
    const active = Math.max(0, total - redeemed - expired);
    return NextResponse.json({ ok: true, period: name, startDay, endDay, totals: { total, redeemed, expired, active, delivered, revealed, disabled }, spins });
  } catch (e: any) {
    console.error('period-metrics error', e);
    return error('INTERNAL', e?.message || 'internal error', 500);
  }
}
