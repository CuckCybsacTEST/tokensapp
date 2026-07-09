export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { verifyUserSessionCookie } from '@/lib/auth';
import { type Period } from '@/lib/date';
import { getTokenPeriodMetrics } from '@/lib/tokenPeriodMetrics';

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

    const metrics = await getTokenPeriodMetrics({ period: periodParam, startDate: start, endDate: end, batchId });
    return NextResponse.json({
      ok: true,
      period: metrics.period,
      startDay: metrics.startDay,
      endDay: metrics.endDay,
      totals: {
        total: metrics.tokens,
        redeemed: metrics.redeemed,
        expired: metrics.expired,
        active: metrics.available,
        delivered: metrics.delivered,
        revealed: metrics.revealed,
        disabled: metrics.disabled,
      },
      spins: metrics.rouletteSpins,
      batchId: batchId || null,
    });
  } catch (e: any) {
    console.error('period-metrics error', e);
    return error('INTERNAL', e?.message || 'internal error', 500);
  }
}
