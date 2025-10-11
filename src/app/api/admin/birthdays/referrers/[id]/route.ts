import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiOk, apiError } from '@/lib/apiError';
import { z } from 'zod';
import { corsHeadersFor } from '@/lib/cors';

const UpdateReferrerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug debe contener solo letras minúsculas, números y guiones').optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cors = corsHeadersFor(req as unknown as Request);

  try {
    const id = params.id;

    const referrer = await prisma.birthdayReferrer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { reservations: true }
        },
        reservations: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            celebrantName: true,
            date: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!referrer) {
      return apiError('NOT_FOUND', 'Referrer not found', undefined, 404, cors);
    }

    return apiOk({ referrer }, 200, cors);
  } catch (error) {
    console.error('Error fetching referrer:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch referrer', undefined, 500, cors);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cors = corsHeadersFor(req as unknown as Request);

  try {
    const id = params.id;
    const body = await req.json();
    const parsed = UpdateReferrerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400, cors);
    }

    const updateData = parsed.data;

    // Verificar que el referrer existe
    const existing = await prisma.birthdayReferrer.findUnique({
      where: { id }
    });
    if (!existing) {
      return apiError('NOT_FOUND', 'Referrer not found', undefined, 404, cors);
    }

    // Si se está cambiando el slug, verificar que no exista
    if (updateData.slug && updateData.slug !== existing.slug) {
      const slugExists = await prisma.birthdayReferrer.findUnique({
        where: { slug: updateData.slug }
      });
      if (slugExists) {
        return apiError('SLUG_EXISTS', 'Slug already exists', undefined, 400, cors);
      }
    }

    const referrer = await prisma.birthdayReferrer.update({
      where: { id },
      data: {
        ...updateData,
        slug: updateData.slug?.toLowerCase(),
      }
    });

    return apiOk({ referrer }, 200, cors);
  } catch (error) {
    console.error('Error updating referrer:', error);
    return apiError('UPDATE_ERROR', 'Failed to update referrer', undefined, 500, cors);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cors = corsHeadersFor(req as unknown as Request);

  try {
    const id = params.id;

    // Verificar que el referrer existe
    const existing = await prisma.birthdayReferrer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { reservations: true }
        }
      }
    });
    if (!existing) {
      return apiError('NOT_FOUND', 'Referrer not found', undefined, 404, cors);
    }

    // No permitir eliminar si tiene reservas asociadas
    if (existing._count.reservations > 0) {
      return apiError('HAS_RESERVATIONS', 'Cannot delete referrer with associated reservations', undefined, 400, cors);
    }

    await prisma.birthdayReferrer.delete({
      where: { id }
    });

    return apiOk({ success: true }, 200, cors);
  } catch (error) {
    console.error('Error deleting referrer:', error);
    return apiError('DELETE_ERROR', 'Failed to delete referrer', undefined, 500, cors);
  }
}