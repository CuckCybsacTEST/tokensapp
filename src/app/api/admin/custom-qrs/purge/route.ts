import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const batches = await (prisma as any).customQrBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        qrs: {
          select: {
            redeemedAt: true,
            expiresAt: true,
            theme: true
          }
        }
      },
    });

    const rows = batches.map((b: any) => {
      const redeemed = b.qrs.filter((q: any) => q.redeemedAt).length;
      const expired = b.qrs.filter((q: any) => !q.redeemedAt && q.expiresAt < new Date()).length;
      const active = Math.max(0, b.qrs.length - redeemed - expired);
      const distinctThemes = new Set(b.qrs.map((q: any) => q.theme)).size;
      return {
        id: b.id,
        name: b.name,
        description: b.description,
        createdAt: b.createdAt,
        totalQrs: b.qrs.length,
        redeemed,
        expired,
        active,
        distinctThemes,
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
    const dryRun = !!body?.options?.dryRun;

    if (!batchIds.length) return err('NO_BATCH_IDS', 'Provide batchIds[]');

    // Aggregations
    const redeemed = await (prisma as any).customQr.groupBy({
      by: ['batchId'],
      where: { batchId: { in: batchIds }, redeemedAt: { not: null } },
      _count: { _all: true },
    });
    const qrCounts = await (prisma as any).customQr.groupBy({
      by: ['batchId'],
      where: { batchId: { in: batchIds } },
      _count: { _all: true }
    });
    const expired = await (prisma as any).customQr.groupBy({
      by: ['batchId'],
      where: {
        batchId: { in: batchIds },
        redeemedAt: null,
        expiresAt: { lt: new Date() }
      },
      _count: { _all: true },
    });

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        batchIds,
        summary: { qrCounts, redeemed, expired }
      });
    }

    // Execute purge
    const deletedQrs = await (prisma as any).customQr.deleteMany({
      where: { batchId: { in: batchIds } }
    });
    const deletedBatches = await (prisma as any).customQrBatch.deleteMany({
      where: { id: { in: batchIds } }
    });

    return NextResponse.json({
      ok: true,
      batchIds,
      deleted: {
        qrs: deletedQrs.count,
        batches: deletedBatches.count
      }
    });
  } catch (e: any) {
    return err('INTERNAL', e?.message || 'internal error', 500);
  }
}