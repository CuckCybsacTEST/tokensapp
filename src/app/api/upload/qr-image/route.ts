import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';
import { ImageOptimizer } from '@/lib/image-optimizer';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Verificar sesión (opcional para subida pública)
    const raw = getSessionCookieFromRequest(req);
    const session = raw ? await verifySessionCookie(raw) : null;

    // Obtener política por defecto
    const policy = await (prisma as any).customQrPolicy.findFirst({
      where: { isDefault: true, isActive: true }
    }) || await (prisma as any).customQrPolicy.findFirst({
      where: { isActive: true }
    });

    if (!policy?.allowImageUpload) {
      return apiError('FORBIDDEN', 'La subida de imágenes no está permitida', undefined, 403);
    }

    // Procesar el archivo multipart
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return apiError('BAD_REQUEST', 'No se encontró archivo de imagen', undefined, 400);
    }

    // Convertir File a Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validar imagen
    const validation = await ImageOptimizer.validateImage(buffer, policy);
    if (!validation.valid) {
      return apiError('BAD_REQUEST', validation.error!, undefined, 400);
    }

    // Inicializar directorios
    await ImageOptimizer.initializeDirectories();

    // Generar nombre único
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = ImageOptimizer.generateFileName(fileExtension);

    // Optimizar imagen
    const { optimizedBuffer, metadata } = await ImageOptimizer.optimizeImage(buffer, {
      quality: policy.imageQuality,
      maxWidth: policy.maxImageWidth,
      maxHeight: policy.maxImageHeight,
      format: fileExtension === 'png' ? 'png' : 'jpeg'
    });

    // Guardar imagen original (opcional)
    const originalUrl = await ImageOptimizer.saveImage(buffer, filename, 'original');

    // Guardar imagen optimizada
    const optimizedUrl = await ImageOptimizer.saveImage(optimizedBuffer, filename.replace(/\.[^.]+$/, '.webp'), 'optimized');

    // Generar y guardar thumbnail
    const thumbnailBuffer = await ImageOptimizer.createThumbnail(buffer, 200);
    const thumbnailFilename = filename.replace(/\.[^.]+$/, '_thumb.webp');
    const thumbnailUrl = await ImageOptimizer.saveImage(thumbnailBuffer, thumbnailFilename, 'thumbnail');

    // Retornar resultado
    return NextResponse.json({
      success: true,
      imageUrl: optimizedUrl,
      originalImageUrl: originalUrl,
      thumbnailUrl: thumbnailUrl,
      filename: filename,
      metadata: {
        ...metadata,
        policy: {
          maxSize: policy.maxImageSize,
          quality: policy.imageQuality,
          maxWidth: policy.maxImageWidth,
          maxHeight: policy.maxImageHeight
        }
      }
    });

  } catch (error: any) {
    console.error('[API] Error subiendo imagen:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}

// Endpoint para obtener estadísticas de imágenes
export async function GET(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);

    const roleCheck = require('@/lib/auth').requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const stats = await ImageOptimizer.getStorageStats();

    // Contar QR con imágenes
    const qrWithImages = await (prisma as any).customQr.count({
      where: { imageUrl: { not: null } }
    });

    return NextResponse.json({
      ...stats,
      qrWithImages
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo estadísticas:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}