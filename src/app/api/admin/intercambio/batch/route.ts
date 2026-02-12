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

    const batches = await (prisma as any).clientExchangeBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        _count: {
          select: { exchanges: true }
        }
      }
    });

    return NextResponse.json(batches);
  } catch (error: any) {
    console.error('[API] Error obteniendo lotes de intercambio:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}

export async function POST(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const body = await req.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return apiError('BAD_REQUEST', 'El nombre del lote es requerido', undefined, 400);
    }

    const batch = await (prisma as any).clientExchangeBatch.create({
      data: {
        name: name.trim(),
        description: body.description?.trim() || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        rewardPrizeId: body.rewardPrizeId || null,
        rewardGroupId: body.rewardGroupId || null,
        exchangeTypes: body.exchangeTypes || 'photo,text',
        triviaQuestionSetId: body.triviaQuestionSetId || null,
        maxExchanges: body.maxExchanges || null,
        policyId: body.policyId || null,
      }
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error creando lote de intercambio:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}
