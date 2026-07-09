export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getGlobalTokenMetrics, getTokenPeriodMetrics } from '@/lib/tokenPeriodMetrics';
import type { Period } from '@/lib/date';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const period = (url.searchParams.get('period') || 'this_week') as Period;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    const allowed: Period[] = ['today', 'yesterday', 'day_before_yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'custom'];
    if (!allowed.includes(period)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }
    if (period === 'custom' && (!startDate || !endDate)) {
      return NextResponse.json({ error: 'Custom period requires startDate and endDate' }, { status: 400 });
    }

    const [global, periodMetrics] = await Promise.all([
      getGlobalTokenMetrics(),
      getTokenPeriodMetrics({ period, startDate, endDate }),
    ]);

    return NextResponse.json({
      ...global,
      period: {
        name: periodMetrics.period,
        startDate: periodMetrics.startDate,
        endDate: periodMetrics.endDate,
        tokens: periodMetrics.tokens,
        redeemed: periodMetrics.redeemed,
        rouletteSpins: periodMetrics.rouletteSpins,
        available: periodMetrics.available,
      },
    });
  } catch (error: any) {
    console.error('admin metrics error', error);
    return NextResponse.json({ error: error?.message || 'internal error' }, { status: 500 });
  }
}
