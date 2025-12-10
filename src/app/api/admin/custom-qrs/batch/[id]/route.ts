export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const batch = await (prisma as any).customQrBatch.findUnique({
      where: { id: params.id },
      include: {
        qrs: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        _count: {
          select: { qrs: true }
        }
      }
    });

    if (!batch) {
      return apiError('NOT_FOUND', 'Lote no encontrado', undefined, 404);
    }

    return NextResponse.json(batch);

  } catch (error: any) {
    console.error('[API] Error obteniendo lote:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const { name, description, theme, isActive } = await req.json();

    if (!name || name.trim().length === 0) {
      return apiError('BAD_REQUEST', 'El nombre del lote es requerido', undefined, 400);
    }

    const batch = await (prisma as any).customQrBatch.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        description: description?.trim(),
        theme: theme || 'default',
        isActive: isActive ?? true
      }
    });

    return NextResponse.json(batch);

  } catch (error: any) {
    console.error('[API] Error actualizando lote:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    // Verificar si el lote tiene QR asociados
    const qrCount = await (prisma as any).customQr.count({
      where: { batchId: params.id }
    });

    if (qrCount > 0) {
      return apiError('BAD_REQUEST', 'No se puede eliminar un lote con QR asociados', undefined, 400);
    }

    await (prisma as any).customQrBatch.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[API] Error eliminando lote:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}