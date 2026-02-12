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

    const exchange = await (prisma as any).clientExchange.findUnique({
      where: { id: params.id },
      include: {
        media: true,
        batch: { select: { id: true, name: true } }
      }
    });

    if (!exchange) return apiError('NOT_FOUND', 'Intercambio no encontrado', undefined, 404);

    return NextResponse.json(exchange);
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

    const exchange = await (prisma as any).clientExchange.update({
      where: { id: params.id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.reviewNote !== undefined && { reviewNote: body.reviewNote }),
        ...(body.reviewedBy !== undefined && { reviewedBy: body.reviewedBy }),
        ...(body.rewardTokenId !== undefined && { rewardTokenId: body.rewardTokenId || null }),
        ...(body.rewardDelivered !== undefined && { rewardDelivered: body.rewardDelivered }),
        ...(body.completedAt !== undefined && { completedAt: body.completedAt ? new Date(body.completedAt) : null }),
      },
      include: { media: true }
    });

    return NextResponse.json(exchange);
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}
