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

    const policies = await (prisma as any).clientExchangePolicy.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json(policies);
  } catch (error: any) {
    console.error('[API] Error obteniendo políticas de intercambio:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}

export async function POST(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const body = await req.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return apiError('BAD_REQUEST', 'El nombre de la política es requerido', undefined, 400);
    }

    // Si es default, quitar flag de otras
    if (body.isDefault) {
      await (prisma as any).clientExchangePolicy.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    // Si es activa, desactivar las demás
    if (body.isActive === true) {
      await (prisma as any).clientExchangePolicy.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
    }

    const policy = await (prisma as any).clientExchangePolicy.create({
      data: {
        name: name.trim(),
        description: body.description?.trim() || null,
        isDefault: body.isDefault ?? false,
        isActive: body.isActive ?? true,
        allowPhoto: body.allowPhoto ?? true,
        allowVideo: body.allowVideo ?? false,
        allowText: body.allowText ?? true,
        allowTrivia: body.allowTrivia ?? false,
        requireWhatsapp: body.requireWhatsapp ?? true,
        requireDni: body.requireDni ?? false,
        maxMediaSize: body.maxMediaSize || 5242880,
        allowedMediaFormats: body.allowedMediaFormats || 'jpg,jpeg,png,webp',
        mediaQuality: body.mediaQuality || 80,
        maxMediaWidth: body.maxMediaWidth || 1200,
        maxMediaHeight: body.maxMediaHeight || 1200,
        maxVideoSize: body.maxVideoSize || 31457280,
        allowedVideoFormats: body.allowedVideoFormats || 'mp4,webm,mov',
        rateLimitPerHour: body.rateLimitPerHour || null,
        maxExchangesPerUser: body.maxExchangesPerUser || null,
        autoReward: body.autoReward ?? true,
      }
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error creando política de intercambio:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}
