export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';
import { DateTime } from 'luxon';

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const policies = await (prisma as any).customQrPolicy.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(policies);

  } catch (error: any) {
    console.error('[API] Error obteniendo políticas:', error);
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

    const {
      name,
      description,
      defaultExpiryDate,
      maxExtensions,
      extensionExpiryDate,
      allowCustomData,
      allowCustomPhrase,
      allowCustomColors,
      allowDni,
      requireWhatsapp,
      requireDni,
      requireUniqueDni,
      rateLimitPerHour,
      maxQrsPerUser,
      requireApproval,
      isDefault,
      isActive,
      defaultBatchId,
      allowImageUpload,
      requireImageUpload,
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

    // Si es política por defecto, quitar el flag de otras
    if (isDefault) {
      await (prisma as any).customQrPolicy.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    // Si se está creando como activa, desactivar las demás
    if (isActive === true) {
      await (prisma as any).customQrPolicy.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
    }

    const policy = await (prisma as any).customQrPolicy.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        defaultExpiryDate: defaultExpiryDate ? DateTime.fromISO(defaultExpiryDate, { zone: 'America/Lima' }).toJSDate() : null,
        maxExtensions: maxExtensions || 1,
        extensionExpiryDate: extensionExpiryDate ? DateTime.fromISO(extensionExpiryDate, { zone: 'America/Lima' }).toJSDate() : null,
        allowCustomData: allowCustomData ?? true,
        allowCustomPhrase: allowCustomPhrase ?? true,
        allowCustomColors: allowCustomColors ?? true,
        allowDni: allowDni ?? false,
        requireWhatsapp: requireWhatsapp ?? true,
        requireDni: requireDni ?? false,
        requireUniqueDni: requireUniqueDni ?? false,
        rateLimitPerHour,
        maxQrsPerUser,
        requireApproval: requireApproval ?? false,
        isDefault: isDefault ?? false,
        isActive: isActive ?? true,
        defaultBatchId,
        allowImageUpload: allowImageUpload ?? true,
        requireImageUpload: requireImageUpload ?? false,
        maxImageSize: maxImageSize || 5242880,
        allowedImageFormats: allowedImageFormats || 'jpg,jpeg,png,webp',
        imageQuality: imageQuality || 80,
        maxImageWidth: maxImageWidth || 1200,
        maxImageHeight: maxImageHeight || 1200,
        defaultTheme: defaultTheme || 'default'
      }
    });

    return NextResponse.json(policy, { status: 201 });

  } catch (error: any) {
    console.error('[API] Error creando política:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}