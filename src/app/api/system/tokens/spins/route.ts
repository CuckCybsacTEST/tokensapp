import { NextRequest, NextResponse } from 'next/server';
import { getDailyTokenMetrics } from '@/lib/dailyTokenMetrics';

export const dynamic = 'force-dynamic';

function error(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const day = req.nextUrl.searchParams.get('day');
    if (!day) return error('MISSING_DAY', 'Parámetro day (YYYY-MM-DD) requerido');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return error('INVALID_DAY', 'Formato day inválido');

    const data = await getDailyTokenMetrics(day);

    return NextResponse.json({
      ok: true,
      day: data.day,
      basis: data.basis,
      metrics: {
        totalSpins: data.metrics.totalSpins,
        rouletteSpins: data.metrics.rouletteSpins,
        retryRevealed: data.metrics.retryRevealed,
        loseRevealed: data.metrics.loseRevealed,
      },
    });
  } catch (e: any) {
    console.error('system/tokens/spins error', e);
    return error('INTERNAL', e?.message || 'internal error', 500);
  }
}