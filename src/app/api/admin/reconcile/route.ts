export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type PrizeRow = { id: string; emittedTotal: number; stock: number | null; lastEmittedAt: Date | null };
type AggRow = { prizeId: string; _count: { _all: number }; _max: { createdAt: Date | null } };

async function reconcileAllPrizes() {
  const prizes: PrizeRow[] = await prisma.prize.findMany({ select: { id: true, emittedTotal: true, stock: true, lastEmittedAt: true } });
  if (prizes.length === 0) return { updated: 0, total: 0 };
  const prizeIds = prizes.map((p: PrizeRow) => p.id);
  const agg = await prisma.token.groupBy({
    by: ['prizeId'],
    where: { prizeId: { in: prizeIds } },
    _count: { _all: true },
    _max: { createdAt: true },
  }) as unknown as AggRow[];
  const mapAgg = new Map(agg.map((a) => [a.prizeId, a]));
  let updated = 0;
  for (const p of prizes) {
    const a = mapAgg.get(p.id) as AggRow | undefined;
    const count = a?._count._all ?? 0;
    const latest = a?._max.createdAt ?? null;
    const nextEmitted = count;
    const nextStock = count > 0 ? (p.stock ?? 0) : p.stock; // si hay emitidos y stock es null, poner 0
    const nextLast = latest && (!p.lastEmittedAt || latest > p.lastEmittedAt) ? latest : p.lastEmittedAt;
    const changed = nextEmitted !== p.emittedTotal || nextStock !== p.stock || (nextLast?.getTime?.() ?? 0) !== (p.lastEmittedAt?.getTime?.() ?? 0);
    if (changed) {
      await prisma.prize.update({ where: { id: p.id }, data: { emittedTotal: nextEmitted, stock: nextStock, lastEmittedAt: nextLast ?? undefined } });
      updated++;
    }
  }
  return { updated, total: prizes.length };
}

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    // Preview diagnostic without changing data
    const prizes = await prisma.prize.count();
    const tokens = await prisma.token.count();
    return NextResponse.json({ ok: true, prizes, tokens, note: 'Use POST to reconcile.' });
  } catch (e: any) {
    console.error('admin reconcile GET error', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const res = await reconcileAllPrizes();
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    console.error('admin reconcile POST error', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
