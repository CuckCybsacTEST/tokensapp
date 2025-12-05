import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError } from '@/lib/apiError';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }

    const id = params.id;

    const { label, color, stock, active } = await req.json();

    const existing = await prisma.prize.findUnique({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Premio no encontrado');
    }

    const updateData: any = {};
    if (label !== undefined) {
      if (!label || label.trim().length === 0) {
        return apiError('INVALID_INPUT', 'Label requerido');
      }
      updateData.label = label.trim();
    }
    if (color !== undefined) updateData.color = color || null;
    if (stock !== undefined) updateData.stock = stock ? parseInt(stock) : null;
    if (active !== undefined) updateData.active = Boolean(active);

    const prize = await prisma.prize.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        key: true,
        label: true,
        color: true,
        stock: true,
        active: true,
        emittedTotal: true
      }
    });

    return NextResponse.json(prize);
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return apiError('NOT_FOUND', 'Premio no encontrado');
    }
    console.error('Error updating reusable prize:', error);
    return apiError('INTERNAL_ERROR', 'Error interno');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }

    const id = params.id;

    // Check if prize exists
    const existing = await prisma.prize.findUnique({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Premio no encontrado');
    }

    // Check if prize is used in any tokens
    const tokenCount = await prisma.token.count({
      where: { prizeId: id }
    });
    if (tokenCount > 0) {
      return apiError('CONFLICT', 'No se puede eliminar premio en uso');
    }

    await prisma.prize.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return apiError('NOT_FOUND', 'Premio no encontrado');
    }
    console.error('Error deleting reusable prize:', error);
    return apiError('INTERNAL_ERROR', 'Error interno');
  }
}