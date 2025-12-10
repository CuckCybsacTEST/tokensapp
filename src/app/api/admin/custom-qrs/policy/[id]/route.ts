export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const {
      name,
      description,
      defaultExpiryDays,
      maxExtensions,
      extensionDays,
      allowCustomData,
      allowCustomPhrase,
      allowCustomColors,
      allowDni,
      requireWhatsapp,
      requireDni,
      rateLimitPerHour,
      maxQrsPerUser,
      requireApproval,
      isDefault,
      isActive,
      defaultBatchId,
      allowImageUpload,
      maxImageSize,
      allowedImageFormats,
      imageQuality,
      maxImageWidth,
      maxImageHeight,
      defaultTheme
    } = await req.json();

    if (!name || name.trim().length === 0) {
      return apiError('BAD_REQUEST', 'El nombre de la política es requerido', undefined, 400);
    }

    // Validar que el batch existe si se proporciona
    if (defaultBatchId) {
      const batch = await (prisma as any).customQrBatch.findUnique({
        where: { id: defaultBatchId }
      });
      if (!batch) {
        return apiError('BAD_REQUEST', 'El lote especificado no existe', undefined, 400);
      }
    }

    // Si se está activando esta política, desactivar las demás
    if (isActive === true) {
      await (prisma as any).customQrPolicy.updateMany({
        where: { isActive: true, id: { not: params.id } },
        data: { isActive: false }
      });
    }

    // Si es política por defecto, quitar el flag de otras
    if (isDefault) {
      await (prisma as any).customQrPolicy.updateMany({
        where: { isDefault: true, id: { not: params.id } },
        data: { isDefault: false }
      });
    }

    const policy = await (prisma as any).customQrPolicy.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        description: description?.trim(),
        defaultExpiryDays,
        maxExtensions: maxExtensions || 1,
        extensionDays: extensionDays || 30,
        allowCustomData: allowCustomData ?? true,
        allowCustomPhrase: allowCustomPhrase ?? true,
        allowCustomColors: allowCustomColors ?? true,
        allowDni: allowDni ?? false,
        requireWhatsapp: requireWhatsapp ?? true,
        requireDni: requireDni ?? false,
        rateLimitPerHour,
        maxQrsPerUser,
        requireApproval: requireApproval ?? false,
        isDefault: isDefault ?? false,
        isActive: isActive ?? true,
        defaultBatchId,
        allowImageUpload: allowImageUpload ?? true,
        maxImageSize: maxImageSize || 5242880,
        allowedImageFormats: allowedImageFormats || 'jpg,jpeg,png,webp',
        imageQuality: imageQuality || 80,
        maxImageWidth: maxImageWidth || 1200,
        maxImageHeight: maxImageHeight || 1200,
        defaultTheme: defaultTheme || 'default'
      }
    });

    return NextResponse.json(policy);

  } catch (error: any) {
    console.error('[API] Error actualizando política:', error);
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

    // Verificar si es política por defecto
    const policy = await (prisma as any).customQrPolicy.findUnique({
      where: { id: params.id }
    });

    if (policy?.isDefault) {
      return apiError('BAD_REQUEST', 'No se puede eliminar la política por defecto', undefined, 400);
    }

    await (prisma as any).customQrPolicy.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[API] Error eliminando política:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}