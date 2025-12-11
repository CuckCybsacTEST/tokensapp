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

    // Contar QR huérfanos (sin lote asignado)
    const orphanQrs = await (prisma as any).customQr.findMany({
      where: { batchId: null },
      select: {
        redeemedAt: true,
        expiresAt: true,
        theme: true
      }
    });

    const orphanStats = {
      totalQrs: orphanQrs.length,
      redeemed: orphanQrs.filter((q: any) => q.redeemedAt).length,
      expired: orphanQrs.filter((q: any) => !q.redeemedAt && q.expiresAt < new Date()).length,
      active: orphanQrs.filter((q: any) => !q.redeemedAt && (!q.expiresAt || q.expiresAt >= new Date())).length,
      distinctThemes: new Set(orphanQrs.map((q: any) => q.theme)).size
    };

    return NextResponse.json({ ok: true, batches: rows, orphanStats });
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
    const purgeOrphansOnly = !!body?.options?.purgeOrphansOnly;

    if (purgeOrphansOnly) {
      // Contar QR huérfanos
      const orphanQrs = await (prisma as any).customQr.findMany({
        where: { batchId: null },
        select: { id: true, redeemedAt: true, expiresAt: true }
      });

      if (dryRun) {
        const redeemed = orphanQrs.filter((q: any) => q.redeemedAt).length;
        const expired = orphanQrs.filter((q: any) => !q.redeemedAt && q.expiresAt < new Date()).length;
        return NextResponse.json({
          ok: true,
          dryRun: true,
          batchIds: [],
          summary: {
            qrCounts: [{ batchId: null, _count: { _all: orphanQrs.length } }],
            redeemed: [{ batchId: null, _count: { _all: redeemed } }],
            expired: [{ batchId: null, _count: { _all: expired } }]
          }
        });
      }

      if (!orphanQrs.length) {
        return NextResponse.json({
          ok: true,
          batchIds: [],
          deleted: { qrs: 0 }
        });
      }

      // Ejecutar purga de huérfanos
      const deletedQrs = await (prisma as any).customQr.deleteMany({
        where: { batchId: null }
      });

      return NextResponse.json({
        ok: true,
        batchIds: [],
        deleted: { qrs: deletedQrs.count }
      });
    }

    if (!batchIds.length) return err('NO_BATCH_IDS', 'Provide batchIds[] or set options.purgeOrphansOnly');

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