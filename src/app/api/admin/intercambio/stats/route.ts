export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const [
      totalExchanges,
      pendingExchanges,
      approvedExchanges,
      rejectedExchanges,
      byType,
      todayExchanges,
      activeBatches,
      recentExchanges
    ] = await Promise.all([
      (prisma as any).clientExchange.count(),
      (prisma as any).clientExchange.count({ where: { status: 'pending' } }),
      (prisma as any).clientExchange.count({ where: { status: 'approved' } }),
      (prisma as any).clientExchange.count({ where: { status: 'rejected' } }),
      (prisma as any).clientExchange.groupBy({
        by: ['exchangeType'],
        _count: { id: true }
      }),
      (prisma as any).clientExchange.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      (prisma as any).clientExchangeBatch.count({ where: { isActive: true } }),
      (prisma as any).clientExchange.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          media: true,
          batch: { select: { id: true, name: true } }
        }
      })
    ]);

    const typeBreakdown: Record<string, number> = {};
    for (const entry of byType) {
      typeBreakdown[entry.exchangeType] = entry._count.id;
    }

    return NextResponse.json({
      totalExchanges,
      pendingExchanges,
      approvedExchanges,
      rejectedExchanges,
      todayExchanges,
      activeBatches,
      typeBreakdown,
      recentExchanges
    });
  } catch (error: any) {
    console.error('[API] Error obteniendo stats de intercambio:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}
