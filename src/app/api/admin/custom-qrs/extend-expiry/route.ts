export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function POST(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const { qrIds, days, reason } = await req.json();

    if (!qrIds || !Array.isArray(qrIds) || qrIds.length === 0) {
      return apiError('BAD_REQUEST', 'Se requieren IDs de QR válidos', undefined, 400);
    }

    if (!days || days < 1 || days > 365) {
      return apiError('BAD_REQUEST', 'Los días deben estar entre 1 y 365', undefined, 400);
    }

    const now = new Date();
    const extensionDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Obtener QR existentes para actualizar metadata
    const existingQrs = await (prisma as any).customQr.findMany({
      where: {
        id: { in: qrIds },
        isActive: true,
        redeemedAt: null,
        revokedAt: null
      },
      select: {
        id: true,
        metadata: true
      }
    });

    // Actualizar cada QR individualmente para manejar metadata correctamente
    const updatePromises = existingQrs.map(async (qr: any) => {
      const currentMetadata = qr.metadata ? JSON.parse(qr.metadata) : {};
      const extensionHistory = currentMetadata.extensionHistory || [];
      
      extensionHistory.push({
        date: now.toISOString(),
        days: days,
        reason: reason || 'Extensión administrativa',
        admin: session.userId
      });

      return (prisma as any).customQr.update({
        where: { id: qr.id },
        data: {
          expiresAt: extensionDate,
          extendedCount: { increment: 1 },
          lastExtendedAt: now,
          metadata: JSON.stringify({
            ...currentMetadata,
            extensionHistory
          })
        }
      });
    });

    const results = await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      updated: results.length,
      message: `Se extendieron ${results.length} QR(s) por ${days} días`
    });

  } catch (error: any) {
    console.error('[API] Error extendiendo expiración:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}