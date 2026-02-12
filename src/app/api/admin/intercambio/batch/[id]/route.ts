export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const batch = await (prisma as any).clientExchangeBatch.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { exchanges: true } },
        exchanges: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { media: true }
        }
      }
    });

    if (!batch) return apiError('NOT_FOUND', 'Lote no encontrado', undefined, 404);

    return NextResponse.json(batch);
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const body = await req.json();

    const batch = await (prisma as any).clientExchangeBatch.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.rewardPrizeId !== undefined && { rewardPrizeId: body.rewardPrizeId || null }),
        ...(body.rewardGroupId !== undefined && { rewardGroupId: body.rewardGroupId || null }),
        ...(body.exchangeTypes !== undefined && { exchangeTypes: body.exchangeTypes }),
        ...(body.triviaQuestionSetId !== undefined && { triviaQuestionSetId: body.triviaQuestionSetId || null }),
        ...(body.maxExchanges !== undefined && { maxExchanges: body.maxExchanges || null }),
        ...(body.policyId !== undefined && { policyId: body.policyId || null }),
      }
    });

    return NextResponse.json(batch);
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    // Delete exchanges and media first (cascade handles media)
    await (prisma as any).clientExchange.deleteMany({
      where: { batchId: params.id }
    });

    await (prisma as any).clientExchangeBatch.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}
