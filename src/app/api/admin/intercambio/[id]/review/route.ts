export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

/**
 * POST /api/admin/intercambio/[id]/review
 * Approve or reject an exchange submission
 * Body: { action: 'approve' | 'reject', reviewNote?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const { action, reviewNote } = await req.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return apiError('BAD_REQUEST', 'Acción inválida. Debe ser "approve" o "reject"', undefined, 400);
    }

    const exchange = await (prisma as any).clientExchange.findUnique({
      where: { id: params.id },
      include: { batch: true }
    });

    if (!exchange) return apiError('NOT_FOUND', 'Intercambio no encontrado', undefined, 404);

    if (exchange.status !== 'pending') {
      return apiError('BAD_REQUEST', `El intercambio ya fue ${exchange.status === 'approved' ? 'aprobado' : 'rechazado'}`, undefined, 400);
    }

    if (action === 'approve') {
      // Try to assign a reward token from the batch configuration
      let rewardTokenId: string | null = null;
      let rewardDelivered = false;

      if (exchange.batch) {
        const assignResult = await assignRewardToken(exchange.batch);
        if (assignResult) {
          rewardTokenId = assignResult.tokenId;
          rewardDelivered = true;
        }
      }

      const updated = await (prisma as any).clientExchange.update({
        where: { id: params.id },
        data: {
          status: 'approved',
          reviewedBy: session.userId || 'admin',
          reviewNote: reviewNote || null,
          completedAt: new Date(),
          rewardTokenId,
          rewardDelivered,
        },
        include: { media: true, batch: { select: { id: true, name: true } } }
      });

      return NextResponse.json({
        exchange: updated,
        rewardAssigned: !!rewardTokenId,
        message: rewardTokenId
          ? 'Intercambio aprobado y premio asignado'
          : 'Intercambio aprobado (sin premio disponible)'
      });
    } else {
      // Reject
      const updated = await (prisma as any).clientExchange.update({
        where: { id: params.id },
        data: {
          status: 'rejected',
          reviewedBy: session.userId || 'admin',
          reviewNote: reviewNote || null,
        },
        include: { media: true, batch: { select: { id: true, name: true } } }
      });

      return NextResponse.json({
        exchange: updated,
        message: 'Intercambio rechazado'
      });
    }
  } catch (error: any) {
    console.error('[API] Error en revisión de intercambio:', error);
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}

/**
 * Find an available ReusableToken from the batch's configured prize/group
 * and mark it as used.
 */
async function assignRewardToken(batch: any): Promise<{ tokenId: string } | null> {
  try {
    // Prefer specific prize, fallback to group
    const where: any = {
      isActive: true,
      usedAt: null,
    };

    if (batch.rewardPrizeId) {
      where.prizeId = batch.rewardPrizeId;
    } else if (batch.rewardGroupId) {
      where.groupId = batch.rewardGroupId;
    } else {
      return null; // No reward configured
    }

    // Find first available token (FIFO by creation date)
    const token = await (prisma as any).reusableToken.findFirst({
      where,
      orderBy: { createdAt: 'asc' }
    });

    if (!token) return null;

    // Mark the token as used
    await (prisma as any).reusableToken.update({
      where: { id: token.id },
      data: {
        isActive: false,
        usedAt: new Date(),
      }
    });

    return { tokenId: token.id };
  } catch (error) {
    console.error('[assignRewardToken] Error asignando token de premio:', error);
    return null;
  }
}
