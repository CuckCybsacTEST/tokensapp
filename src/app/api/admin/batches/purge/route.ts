import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Admin UI oriented endpoints (separate from /api/system to reuse existing auth patterns for ADMIN-only destructive actions)
// GET /api/admin/batches/purge -> list recent batches (lightweight counts) for selection
// POST /api/admin/batches/purge { batchIds: string[], options?: { dryRun?: boolean; deleteUnusedPrizes?: boolean } }
//   Mirrors logic of /api/system/tokens/purge-batches but returns a UI-friendly shape and enforces ADMIN.

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
    const batches = await (prisma as any).batch.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        description: true,
        createdAt: true,
        _count: { select: { tokens: true } },
        tokens: { select: { redeemedAt: true, deliveredAt: true, expiresAt: true, disabled: true, prizeId: true } },
      },
    });

    const rows = batches.map((b: any) => {
      const redeemed = b.tokens.filter((t: any) => t.redeemedAt || t.deliveredAt).length;
      const expired = b.tokens.filter((t: any) => !t.redeemedAt && !t.deliveredAt && t.expiresAt < new Date()).length;
      const active = b.tokens.length - redeemed - expired;
      return {
        id: b.id,
        description: b.description,
        createdAt: b.createdAt,
        totalTokens: b.tokens.length,
        redeemedOrDelivered: redeemed,
        expired,
        active: active < 0 ? 0 : active,
        distinctPrizes: new Set(b.tokens.map((t: any) => t.prizeId)).size,
      };
    });
    return NextResponse.json({ ok: true, batches: rows });
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
    if (!batchIds.length) return err('NO_BATCH_IDS', 'Provide batchIds[]');
    const dryRun = !!body?.options?.dryRun;
    const deleteUnusedPrizes = !!body?.options?.deleteUnusedPrizes;

    // reuse logic similar to system endpoint
    const redeemed = await prisma.token.groupBy({
      by: ['batchId'],
      where: { batchId: { in: batchIds }, OR: [{ redeemedAt: { not: null } }, { deliveredAt: { not: null } }] },
      _count: { _all: true },
    });
    const tokenCounts = await prisma.token.groupBy({ by: ['batchId'], where: { batchId: { in: batchIds } }, _count: { _all: true } });
    const rouletteSessions = await prisma.rouletteSession.findMany({ where: { batchId: { in: batchIds } }, select: { id: true, batchId: true } });
    const spins = await prisma.rouletteSpin.count({ where: { sessionId: { in: rouletteSessions.map(r => r.id) } } });

    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, batchIds, summary: { tokenCounts, rouletteSessions: rouletteSessions.length, spins, redeemed } });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (rouletteSessions.length) {
        await tx.rouletteSpin.deleteMany({ where: { sessionId: { in: rouletteSessions.map(r => r.id) } } });
        await tx.rouletteSession.deleteMany({ where: { id: { in: rouletteSessions.map(r => r.id) } } });
      }
      await tx.token.deleteMany({ where: { batchId: { in: batchIds } } });
      await tx.batch.deleteMany({ where: { id: { in: batchIds } } });
      let deletedPrizes: string[] = [];
      if (deleteUnusedPrizes) {
        const prizes = await tx.prize.findMany({ select: { id: true }, where: { tokens: { none: {} }, assignedTokens: { none: {} } } });
        if (prizes.length) {
          await tx.prize.deleteMany({ where: { id: { in: prizes.map(p => p.id) } } });
          deletedPrizes = prizes.map(p => p.id);
        }
      }
      return { deletedPrizes } as const;
    });

    return NextResponse.json({ ok: true, batchIds, deleted: { tokenCounts, rouletteSessions: rouletteSessions.length, spins, redeemed, prizes: result.deletedPrizes } });
  } catch (e: any) {
    return err('INTERNAL', e?.message || 'internal error', 500);
  }
}
