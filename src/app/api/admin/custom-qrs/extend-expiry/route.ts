export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';
import { DateTime } from 'luxon';

export async function POST(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const { qrIds, expiryDate, reason } = await req.json();

    if (!qrIds || !Array.isArray(qrIds) || qrIds.length === 0) {
      return apiError('BAD_REQUEST', 'Se requieren IDs de QR válidos', undefined, 400);
    }

    if (!expiryDate) {
      return apiError('BAD_REQUEST', 'Se requiere una fecha de expiración', undefined, 400);
    }

    const extensionDate = DateTime.fromISO(expiryDate, { zone: 'America/Lima' }).toJSDate();
    const now = DateTime.now().setZone('America/Lima').toJSDate();

    if (extensionDate <= now) {
      return apiError('BAD_REQUEST', 'La fecha de expiración debe ser futura', undefined, 400);
    }

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
        newExpiryDate: expiryDate,
        reason: reason || 'Cambio de fecha de expiración administrativa',
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
      message: `Se cambió la fecha de expiración de ${results.length} QR(s) a ${extensionDate.toLocaleDateString('es-PE')}`
    });

  } catch (error: any) {
    console.error('[API] Error extendiendo expiración:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}