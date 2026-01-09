import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

// POST /api/admin/reusable-tokens/[tokenId]/deliver
// Marca un token reutilizable como entregado (solo para STAFF/ADMIN)

export async function POST(req: NextRequest, { params }: { params: { tokenId: string } }) {
  try {
    const { tokenId } = params;
    if (!tokenId) {
      return apiError('TOKEN_ID_REQUIRED', 'tokenId requerido', undefined, 400);
    }

    // Verificar autenticación - solo STAFF/ADMIN pueden marcar entregas
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }

    if (!session) {
      return apiError('UNAUTHORIZED', 'Sesión inválida');
    }

    // Verificar que el token existe y es reutilizable
    const token = await prisma.reusableToken.findUnique({
      where: { id: tokenId },
      include: {
        prize: { select: { key: true, label: true } }
      }
    });

    if (!token) {
      return apiError('TOKEN_NOT_FOUND', 'Token no encontrado', undefined, 404);
    }

    // Para admin/staff, permitir marcar como entregado incluso si ya fue usado
    // Esto es útil cuando se entrega físicamente después del canje digital
    // Solo verificar que el token existe y no esté ya marcado como entregado
    if (token.deliveredAt) {
      return apiError('ALREADY_DELIVERED', 'Token ya marcado como entregado', undefined, 409);
    }

    // Marcar como entregado
    const deliveredAt = new Date();
    const updateData: any = {
      deliveredAt,
      deliveredByUserId: session.userId
    };

    // Solo incrementar usedCount si el token no está agotado
    // Para admin/staff, permitir marcar entrega física sin afectar el contador digital
    if (token.usedCount < token.maxUses) {
      updateData.usedCount = { increment: 1 };
    }

    await prisma.reusableToken.update({
      where: { id: tokenId },
      data: updateData
    });

    return apiOk({
      tokenId,
      prizeId: token.prizeId,
      prize: token.prize,
      deliveredAt,
      deliveredBy: session.userId
    });

  } catch (error) {
    console.error('Error marking reusable token as delivered:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor');
  }
}