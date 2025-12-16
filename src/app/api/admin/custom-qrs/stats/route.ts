export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function GET(req: Request) {
  console.log('[api/custom-qrs/stats] GET request received');
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    // Obtener zona horaria de Lima
    const limaTimeZone = 'America/Lima';
    const now = new Date();
    const today = new Date(now.toLocaleDateString('en-CA', { timeZone: limaTimeZone }));

    // Usar raw SQL para optimizar: una sola query para todas las estadísticas
    const statsQuery = await prisma.$queryRaw`
      SELECT
        COUNT(*) as total_created,
        COUNT(CASE WHEN "redeemedAt" IS NOT NULL THEN 1 END) as total_redeemed,
        COUNT(CASE WHEN "isActive" = true AND "redeemedAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt" > ${now}) THEN 1 END) as total_active,
        COUNT(CASE WHEN "expiresAt" < ${now} THEN 1 END) as total_expired,
        COUNT(CASE WHEN DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima') = DATE(${today} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima') THEN 1 END) as created_today,
        COUNT(CASE WHEN DATE("redeemedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima') = DATE(${today} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima') THEN 1 END) as redeemed_today
      FROM "custom_qr"
    ` as any;

    const {
      total_created,
      total_redeemed,
      total_active,
      total_expired,
      created_today,
      redeemed_today
    } = statsQuery[0];

    // Estadísticas por tema (top 20)
    const themeStats = await (prisma as any).customQr.groupBy({
      by: ['theme'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    });

    const byTheme = themeStats.reduce((acc: Record<string, number>, stat: any) => {
      acc[stat.theme] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Estadísticas por campaña (top 20)
    const campaignStats = await (prisma as any).customQr.groupBy({
      by: ['campaignName'],
      _count: { id: true },
      where: { campaignName: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    });

    const byCampaign = campaignStats.reduce((acc: Record<string, number>, stat: any) => {
      if (stat.campaignName) {
        acc[stat.campaignName] = stat._count.id;
      }
      return acc;
    }, {} as Record<string, number>);

    console.log('[api/custom-qrs/stats] Returning stats');
    return NextResponse.json({
      totalCreated: Number(total_created),
      totalRedeemed: Number(total_redeemed),
      totalActive: Number(total_active),
      totalExpired: Number(total_expired),
      createdToday: Number(created_today),
      redeemedToday: Number(redeemed_today),
      byTheme,
      byCampaign
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo estadísticas de QR:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}