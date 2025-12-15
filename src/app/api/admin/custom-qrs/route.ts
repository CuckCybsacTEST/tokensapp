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

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Obtener QR con paginación
    const [qrs, total] = await Promise.all([
      (prisma as any).customQr.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          code: true,
          customerName: true,
          customerWhatsapp: true,
          customerDni: true,
          customerPhrase: true,
          customData: true,
          theme: true,
          imageUrl: true,
          originalImageUrl: true,
          thumbnailUrl: true,
          imageMetadata: true,
          isActive: true,
          expiresAt: true,
          redeemedAt: true,
          redeemedBy: true,
          createdAt: true,
          extendedCount: true,
          lastExtendedAt: true,
          revokedAt: true,
          revokedBy: true,
          revokeReason: true,
          campaignName: true,
          batchId: true,
          batch: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      (prisma as any).customQr.count()
    ]);

    return NextResponse.json({
      qrs: qrs.map((qr: any) => ({
        ...qr,
        expiresAt: qr.expiresAt?.toISOString() || null,
        redeemedAt: qr.redeemedAt?.toISOString() || null,
        createdAt: qr.createdAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo QR personalizados:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}