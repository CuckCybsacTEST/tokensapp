export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function GET(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const url = new URL(req.url);
    const batchId = url.searchParams.get('batchId');
    const status = url.searchParams.get('status');
    const exchangeType = url.searchParams.get('exchangeType');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (batchId) where.batchId = batchId;
    if (status) where.status = status;
    if (exchangeType) where.exchangeType = exchangeType;

    const [exchanges, total] = await Promise.all([
      (prisma as any).clientExchange.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          media: true,
          batch: { select: { id: true, name: true } }
        }
      }),
      (prisma as any).clientExchange.count({ where })
    ]);

    return NextResponse.json({
      exchanges,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('[API] Error obteniendo intercambios:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}
