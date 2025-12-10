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

    const { qrIds, reason } = await req.json();

    if (!qrIds || !Array.isArray(qrIds) || qrIds.length === 0) {
      return apiError('BAD_REQUEST', 'Se requieren IDs de QR válidos', undefined, 400);
    }

    if (!reason || reason.trim().length === 0) {
      return apiError('BAD_REQUEST', 'Se requiere una razón para la revocación', undefined, 400);
    }

    const now = new Date();

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
      const revocationHistory = currentMetadata.revocationHistory || [];
      
      revocationHistory.push({
        date: now.toISOString(),
        reason: reason,
        admin: session.userId
      });

      return (prisma as any).customQr.update({
        where: { id: qr.id },
        data: {
          isActive: false,
          revokedAt: now,
          revokedBy: session.userId,
          revokeReason: reason,
          metadata: JSON.stringify({
            ...currentMetadata,
            revocationHistory
          })
        }
      });
    });

    const results = await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      revoked: results.length,
      message: `Se revocaron ${results.length} QR(s)`
    });

  } catch (error: any) {
    console.error('[API] Error revocando QR:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}