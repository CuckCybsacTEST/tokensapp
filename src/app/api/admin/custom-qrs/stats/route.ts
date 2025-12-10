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

    // Obtener zona horaria de Lima
    const limaTimeZone = 'America/Lima';
    const now = new Date();
    const today = new Date(now.toLocaleDateString('en-CA', { timeZone: limaTimeZone }));

    // Estadísticas generales
    const [
      totalCreated,
      totalRedeemed,
      totalActive,
      totalExpired,
      createdToday,
      redeemedToday
    ] = await Promise.all([
      // Total creados
      (prisma as any).customQr.count(),

      // Total redimidos
      (prisma as any).customQr.count({
        where: { redeemedAt: { not: null } }
      }),

      // Total activos (no redimidos, no expirados, activos)
      (prisma as any).customQr.count({
        where: {
          isActive: true,
          redeemedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        }
      }),

      // Total expirados
      (prisma as any).customQr.count({
        where: {
          expiresAt: { lt: now }
        }
      }),

      // Creados hoy
      (prisma as any).customQr.count({
        where: {
          createdAt: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Redimidos hoy
      (prisma as any).customQr.count({
        where: {
          redeemedAt: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Estadísticas por tema
    const themeStats = await (prisma as any).customQr.groupBy({
      by: ['theme'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    const byTheme = themeStats.reduce((acc: Record<string, number>, stat: any) => {
      acc[stat.theme] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Estadísticas por campaña
    const campaignStats = await (prisma as any).customQr.groupBy({
      by: ['campaignName'],
      _count: { id: true },
      where: { campaignName: { not: null } },
      orderBy: { _count: { id: 'desc' } }
    });

    const byCampaign = campaignStats.reduce((acc: Record<string, number>, stat: any) => {
      if (stat.campaignName) {
        acc[stat.campaignName] = stat._count.id;
      }
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      totalCreated,
      totalRedeemed,
      totalActive,
      totalExpired,
      createdToday,
      redeemedToday,
      byTheme,
      byCampaign
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo estadísticas de QR:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}