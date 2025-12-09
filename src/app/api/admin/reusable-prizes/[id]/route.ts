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

    const { label, key, color, description } = await req.json();

    const existing = await prisma.reusablePrize.findUnique({ where: { id } });
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
    if (key !== undefined) {
      if (!key || key.trim().length === 0) {
        return apiError('INVALID_INPUT', 'Key requerido');
      }
      // Check if key already exists (excluding current prize)
      const keyExists = await prisma.reusablePrize.findFirst({
        where: { key: key.trim(), id: { not: id } }
      });
      if (keyExists) {
        return apiError('CONFLICT', 'Ya existe un premio con esa key');
      }
      updateData.key = key.trim();
    }
    if (color !== undefined) updateData.color = color || null;
    if (description !== undefined) updateData.description = description?.trim() || null;

    const prize = await prisma.reusablePrize.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        key: true,
        label: true,
        color: true,
        description: true,
        active: true,
        createdAt: true
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
    const existing = await prisma.reusablePrize.findUnique({ where: { id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'Premio no encontrado');
    }

    // Check if prize is used in any tokens
    const tokenCount = await prisma.reusableToken.count({
      where: { prizeId: id }
    });
    if (tokenCount > 0) {
      return apiError('CONFLICT', `No se puede eliminar premio en uso (${tokenCount} tokens asociados)`);
    }

    await prisma.reusablePrize.delete({
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