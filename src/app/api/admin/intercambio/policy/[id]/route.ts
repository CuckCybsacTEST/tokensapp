export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const policy = await (prisma as any).clientExchangePolicy.findUnique({
      where: { id: params.id }
    });

    if (!policy) return apiError('NOT_FOUND', 'Política no encontrada', undefined, 404);

    return NextResponse.json(policy);
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const body = await req.json();

    if (body.isDefault) {
      await (prisma as any).clientExchangePolicy.updateMany({
        where: { isDefault: true, id: { not: params.id } },
        data: { isDefault: false }
      });
    }

    if (body.isActive === true) {
      await (prisma as any).clientExchangePolicy.updateMany({
        where: { isActive: true, id: { not: params.id } },
        data: { isActive: false }
      });
    }

    const policy = await (prisma as any).clientExchangePolicy.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.allowPhoto !== undefined && { allowPhoto: body.allowPhoto }),
        ...(body.allowVideo !== undefined && { allowVideo: body.allowVideo }),
        ...(body.allowText !== undefined && { allowText: body.allowText }),
        ...(body.allowTrivia !== undefined && { allowTrivia: body.allowTrivia }),
        ...(body.requireWhatsapp !== undefined && { requireWhatsapp: body.requireWhatsapp }),
        ...(body.requireDni !== undefined && { requireDni: body.requireDni }),
        ...(body.maxMediaSize !== undefined && { maxMediaSize: body.maxMediaSize }),
        ...(body.allowedMediaFormats !== undefined && { allowedMediaFormats: body.allowedMediaFormats }),
        ...(body.mediaQuality !== undefined && { mediaQuality: body.mediaQuality }),
        ...(body.maxMediaWidth !== undefined && { maxMediaWidth: body.maxMediaWidth }),
        ...(body.maxMediaHeight !== undefined && { maxMediaHeight: body.maxMediaHeight }),
        ...(body.maxVideoSize !== undefined && { maxVideoSize: body.maxVideoSize }),
        ...(body.allowedVideoFormats !== undefined && { allowedVideoFormats: body.allowedVideoFormats }),
        ...(body.rateLimitPerHour !== undefined && { rateLimitPerHour: body.rateLimitPerHour }),
        ...(body.maxExchangesPerUser !== undefined && { maxExchangesPerUser: body.maxExchangesPerUser }),
        ...(body.autoReward !== undefined && { autoReward: body.autoReward }),
      }
    });

    return NextResponse.json(policy);
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    await (prisma as any).clientExchangePolicy.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}
