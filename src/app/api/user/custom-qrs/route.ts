export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';

export async function GET(req: NextRequest) {
  console.log('[api/user/custom-qrs] GET request received');
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const userSession = await verifyUserSessionCookie(userCookie);
    if (!userSession) return apiError('UNAUTHORIZED', 'No session', undefined, 401);

    // Page already verifies STAFF role, so no need to check here

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Obtener QR con paginación
    const qrsQuery = prisma.customQr.findMany({
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
      },
    });

    const [qrs, totalCount] = await Promise.all([
      qrsQuery,
      prisma.customQr.count()
    ]);

    const hasMore = offset + qrs.length < totalCount;

    console.log(`[api/user/custom-qrs] Returning ${qrs.length} QRs for page ${page}`);

    return apiOk({
      qrs,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore
      }
    });
  } catch (error) {
    console.error('[api/user/custom-qrs] Error:', error);
    return apiError('INTERNAL_ERROR', 'Internal server error', undefined, 500);
  }
}