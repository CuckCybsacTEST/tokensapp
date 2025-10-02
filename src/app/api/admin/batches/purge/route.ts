import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Admin UI oriented endpoints
// GET  /api/admin/batches/purge -> list recent batches + orphan prizes
// POST /api/admin/batches/purge { batchIds?: string[], options?: { dryRun?: boolean; deleteUnusedPrizes?: boolean; purgeOrphansOnly?: boolean } }
//   - purgeOrphansOnly: ignora batchIds y solo actúa sobre prizes huérfanos

function err(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req as any);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) return err('FORBIDDEN', 'ADMIN required', 403);

    const limit = Math.min(200, Math.max(1, parseInt((req.nextUrl.searchParams.get('limit') || '50'), 10)));
    const batches = await prisma.batch.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        description: true,
        createdAt: true,
        tokens: { select: { redeemedAt: true, deliveredAt: true, expiresAt: true, prizeId: true } },
      },
    });

    const rows = batches.map((b: any) => {
      const redeemed = b.tokens.filter((t: any) => t.redeemedAt || t.deliveredAt).length;
      const expired = b.tokens.filter((t: any) => !t.redeemedAt && !t.deliveredAt && t.expiresAt < new Date()).length;
      const active = Math.max(0, b.tokens.length - redeemed - expired);
      return {
        id: b.id,
        description: b.description,
        createdAt: b.createdAt,
        totalTokens: b.tokens.length,
        redeemedOrDelivered: redeemed,
        expired,
        active,
        distinctPrizes: new Set(b.tokens.map((t: any) => t.prizeId)).size,
      };
    });

    const orphanPrizes = await prisma.prize.findMany({
      where: { tokens: { none: {} }, assignedTokens: { none: {} } },
      select: { id: true, key: true, label: true, emittedTotal: true, stock: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ ok: true, batches: rows, orphanPrizes });
  } catch (e: any) {
    return err('INTERNAL', e?.message || 'internal error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req as any);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) return err('FORBIDDEN', 'ADMIN required', 403);

    const body = await req.json().catch(() => ({}));
    const batchIds: string[] = Array.isArray(body.batchIds) ? body.batchIds.filter((x: any) => typeof x === 'string' && x.trim()) : [];
    const dryRun = !!body?.options?.dryRun;
    const deleteUnusedPrizes = !!body?.options?.deleteUnusedPrizes;
    const purgeOrphansOnly = !!body?.options?.purgeOrphansOnly;

    if (purgeOrphansOnly) {
      const orphanIds = await prisma.prize.findMany({ where: { tokens: { none: {} }, assignedTokens: { none: {} } }, select: { id: true } });
      const ids = orphanIds.map((o: any) => o.id);
      if (dryRun) return NextResponse.json({ ok: true, dryRun: true, batchIds: [], summary: { orphanPrizes: ids } });
      if (!ids.length) return NextResponse.json({ ok: true, batchIds: [], deleted: { orphanPrizes: [] } });
      await prisma.prize.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ ok: true, batchIds: [], deleted: { orphanPrizes: ids } });
    }

    if (!batchIds.length) return err('NO_BATCH_IDS', 'Provide batchIds[] or set options.purgeOrphansOnly');

    // Aggregations
    const redeemed = await prisma.token.groupBy({
      by: ['batchId'],
      where: { batchId: { in: batchIds }, OR: [{ redeemedAt: { not: null } }, { deliveredAt: { not: null } }] },
      _count: { _all: true },
    });
    const tokenCounts = await prisma.token.groupBy({ by: ['batchId'], where: { batchId: { in: batchIds } }, _count: { _all: true } });
    const rouletteSessions = await prisma.rouletteSession.findMany({ where: { batchId: { in: batchIds } }, select: { id: true } });
  const spins = await prisma.rouletteSpin.count({ where: { sessionId: { in: rouletteSessions.map((r: any) => r.id) } } });

    if (dryRun) {
      const orphanIds = deleteUnusedPrizes
  ? (await prisma.prize.findMany({ where: { tokens: { none: {} }, assignedTokens: { none: {} } }, select: { id: true } })).map((o: any) => o.id)
        : undefined;
      return NextResponse.json({ ok: true, dryRun: true, batchIds, summary: { tokenCounts, rouletteSessions: rouletteSessions.length, spins, redeemed, orphanPrizes: orphanIds } });
    }

    const deleted = await prisma.$transaction(async (tx: any) => {
      if (rouletteSessions.length) {
        await tx.rouletteSpin.deleteMany({ where: { sessionId: { in: rouletteSessions.map((r: any) => r.id) } } });
        await tx.rouletteSession.deleteMany({ where: { id: { in: rouletteSessions.map((r: any) => r.id) } } });
      }
      await tx.token.deleteMany({ where: { batchId: { in: batchIds } } });
      await tx.batch.deleteMany({ where: { id: { in: batchIds } } });
      let prizes: string[] = [];
      if (deleteUnusedPrizes) {
        const orphanIdsTx = await tx.prize.findMany({ where: { tokens: { none: {} }, assignedTokens: { none: {} } }, select: { id: true } });
        if (orphanIdsTx.length) {
          prizes = orphanIdsTx.map((o: any) => o.id);
          await tx.prize.deleteMany({ where: { id: { in: prizes } } });
        }
      }
      return { prizes };
    });

    return NextResponse.json({ ok: true, batchIds, deleted: { tokenCounts, rouletteSessions: rouletteSessions.length, spins, redeemed, prizes: deleted.prizes } });
  } catch (e: any) {
    return err('INTERNAL', e?.message || 'internal error', 500);
  }
}
