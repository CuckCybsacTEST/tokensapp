export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';
import { audit } from '@/lib/audit';

interface RouteParams {
  params: { id: string };
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const qrId = params.id;

    // Verificar que el QR existe y no está redimido
    const customQr = await (prisma as any).customQr.findUnique({
      where: { id: qrId },
      select: {
        id: true,
        code: true,
        customerName: true,
        redeemedAt: true,
        isActive: true
      }
    });

    if (!customQr) {
      return apiError('NOT_FOUND', 'QR no encontrado', undefined, 404);
    }

    if (customQr.redeemedAt) {
      return apiError('ALREADY_REDEEMED', 'Este QR ya fue redimido', undefined, 409);
    }

    if (!customQr.isActive) {
      return apiError('INACTIVE', 'Este QR está inactivo', undefined, 409);
    }

    // Redimir el QR
    const now = new Date();
    await (prisma as any).customQr.update({
      where: { id: qrId },
      data: {
        redeemedAt: now,
        redeemedBy: session.userId // Guardar quién lo redimió
      }
    });

    // Registrar auditoría
    await audit('custom_qr_redeemed', session.userId, {
      qrCode: customQr.code,
      customerName: customQr.customerName,
      redeemedBy: session.userId
    });

    return NextResponse.json({
      ok: true,
      message: 'QR redimido exitosamente',
      redeemedAt: now.toISOString(),
      redeemedBy: session.userId
    });

  } catch (error: any) {
    console.error('[API] Error redimiendo QR:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}