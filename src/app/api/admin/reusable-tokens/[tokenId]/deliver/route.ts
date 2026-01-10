import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { mapAreaToStaffRole } from '@/lib/staff-roles';
import { isValidArea } from '@/lib/areas';
import { apiError, apiOk } from '@/lib/apiError';

// POST /api/admin/reusable-tokens/[tokenId]/deliver
// Marca un token reutilizable como entregado (solo para STAFF/ADMIN)

export async function POST(req: NextRequest, { params }: { params: { tokenId: string } }) {
  try {
    const { tokenId } = params;
    if (!tokenId) {
      return apiError('TOKEN_ID_REQUIRED', 'tokenId requerido', undefined, 400);
    }

    // Verificar autenticación - aceptar tanto admin_session como user_session para STAFF
    let session = null;
    let userRole = null;

    // Primero intentar con admin_session
    const adminRaw = getSessionCookieFromRequest(req);
    const adminSession = await verifySessionCookie(adminRaw);
    if (adminSession) {
      session = adminSession;
      userRole = 'ADMIN'; // Los admin tienen acceso completo
    } else {
      // Si no hay admin_session, intentar con user_session
      const userRaw = getUserSessionCookieFromRequest(req);
      const userSession = await verifyUserSessionCookie(userRaw);
      if (userSession) {
        // Verificar que el usuario tenga rol STAFF
        const user = await prisma.user.findUnique({
          where: { id: userSession.userId },
          include: { person: true }
        });
        if (user?.person?.area) {
          const area = user.person.area;
          if (isValidArea(area)) {
            userRole = mapAreaToStaffRole(area);
            if (userRole) {
              session = userSession;
            }
          }
        }
      }
    }

    if (!session || !userRole) {
      return apiError('UNAUTHORIZED', 'No autorizado - se requiere sesión de STAFF o ADMIN');
    }

    // Verificar permisos - STAFF y ADMIN pueden marcar entregas
    if (!['ADMIN', 'STAFF', 'WAITER', 'CASHIER', 'BARTENDER'].includes(userRole)) {
      return apiError('UNAUTHORIZED', 'Rol insuficiente para marcar entregas');
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
    // O cuando se necesita re-entregar por correcciones
    // Solo verificar que el token existe

    // No permitir marcar como entregado si ya está completamente usado
    if (token.usedCount >= token.maxUses) {
      return apiError('TOKEN_EXHAUSTED', `Token completamente usado (${token.usedCount}/${token.maxUses})`, undefined, 400);
    }

    // Marcar como entregado (permitir re-entregas)
    const deliveredAt = new Date();
    const updateData: any = {
      deliveredAt,
      deliveredByUserId: session.userId
    };

    // Incrementar usedCount cada vez que se marca como entregado
    // Esto refleja el número real de entregas realizadas
    updateData.usedCount = { increment: 1 };

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