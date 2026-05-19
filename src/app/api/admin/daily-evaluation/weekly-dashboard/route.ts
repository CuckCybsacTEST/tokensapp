import { NextRequest, NextResponse } from 'next/server';

import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { getDailyJourneyDashboard, getWeeklyJourneyDashboard } from '@/lib/weekly-journey-stats';

export const dynamic = 'force-dynamic';

function getBusinessDay() {
  const now = new Date();
  const limaHour = Number(now.toLocaleString('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }));
  const ref = limaHour < 10 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
  return ref.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

export async function GET(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'COORDINATOR'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const day = req.nextUrl.searchParams.get('day') || getBusinessDay();
    const granularity = req.nextUrl.searchParams.get('granularity');

    if (granularity === 'day') {
      const dayCountParam = Number(req.nextUrl.searchParams.get('days') || '7');
      const dayCount = Number.isFinite(dayCountParam) ? Math.min(Math.max(Math.trunc(dayCountParam), 1), 30) : 7;
      const dashboard = await getDailyJourneyDashboard(day, dayCount);
      return NextResponse.json(dashboard);
    }

    const weekCountParam = Number(req.nextUrl.searchParams.get('weeks') || '8');
    const weekCount = Number.isFinite(weekCountParam)
      ? Math.min(Math.max(Math.trunc(weekCountParam), 4), 60)
      : 8;

    const dashboard = await getWeeklyJourneyDashboard(day, weekCount);
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error fetching weekly journey dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}