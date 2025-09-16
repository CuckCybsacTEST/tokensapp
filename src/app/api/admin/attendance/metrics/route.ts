import { NextResponse } from 'next/server';
import { getAttendanceMetrics } from '@/lib/metrics/attendance';
import type { Period } from '@/types/metrics';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

function badRequest(message: string, code: string = 'BAD_REQUEST') {
  return NextResponse.json({ ok: false, code, message }, { status: 400 });
}

function ensureYmd(input?: string | null): string | null {
  if (!input) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  return input;
}

export async function GET(req: Request) {
  try {
    // Auth: ADMIN/STAFF only
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const roleCheck = requireRole(session, ['ADMIN', 'STAFF']);
    if (!roleCheck.ok) {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const url = new URL(req.url);
    const periodParam = (url.searchParams.get('period') || 'today').toLowerCase() as Period;
    const allowed: Period[] = ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'custom'];
    if (!allowed.includes(periodParam)) {
      return badRequest(`Invalid period: ${periodParam}`);
    }

    const startDate = ensureYmd(url.searchParams.get('startDate')) || undefined;
    const endDate = ensureYmd(url.searchParams.get('endDate')) || undefined;
  const area = url.searchParams.get('area') || undefined;
  const person = url.searchParams.get('person') || undefined;

    if (periodParam === 'custom') {
      if (!startDate || !endDate) {
        return badRequest('custom period requires startDate and endDate in YYYY-MM-DD');
      }
      if (startDate > endDate) {
        return badRequest('startDate must be <= endDate');
      }
    }

  const metrics = await getAttendanceMetrics({ period: periodParam, startDate, endDate, area, person });
    return NextResponse.json({ ok: true, ...metrics }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: msg }, { status: 500 });
  }
}
