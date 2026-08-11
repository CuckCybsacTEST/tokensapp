import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';
import { STORAGE_BUCKET, supabaseAdmin, uploadBufferToSupabase, deleteFromSupabase } from '@/lib/supabase-server';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export async function POST(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);

    const roleCheck = requireRole(session, ['ADMIN', 'COORDINATOR']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return apiError('INVALID_CONTENT_TYPE', 'Tipo de contenido invalido', undefined, 400);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;

    if (!file || !file.size) {
      return apiError('FILE_REQUIRED', 'No se proporciono ningun archivo', undefined, 400);
    }

    if (!name || !name.trim()) {
      return apiError('NAME_REQUIRED', 'No se proporciono un nombre para la plantilla', undefined, 400);
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return apiError('INVALID_IMAGE_TYPE', 'El archivo debe ser una imagen PNG, JPG o WebP', { type: file.type }, 400);
    }

    if (file.size > MAX_BYTES) {
      return apiError('FILE_TOO_LARGE', 'La plantilla es demasiado grande', { maxBytes: MAX_BYTES }, 400);
    }

    const contentLength = Number(req.headers.get('content-length') || '0');
    if (contentLength && contentLength > MAX_BYTES) {
      return apiError('FILE_TOO_LARGE', 'La plantilla es demasiado grande', { maxBytes: MAX_BYTES }, 400);
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const optimizedBuffer = await sharp(inputBuffer).rotate().png({ compressionLevel: 9 }).toBuffer();

    const templateId = `template_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const storageKey = `templates/${templateId}.png`;

    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some((bucket: any) => bucket.name === STORAGE_BUCKET);
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
          public: true,
          fileSizeLimit: MAX_BYTES,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        });
      }
    } catch (bucketError) {
      console.warn('No se pudo verificar/crear el bucket de plantillas:', bucketError);
    }

    const url = await uploadBufferToSupabase(optimizedBuffer, storageKey, 'image/png', STORAGE_BUCKET);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const oldTemplates = await prisma.printTemplate.findMany({
      where: {
        createdAt: {
          lt: oneDayAgo,
        },
      },
      select: {
        id: true,
        storageKey: true,
      },
    });

    for (const oldTemplate of oldTemplates) {
      if (oldTemplate.storageKey) {
        await deleteFromSupabase(oldTemplate.storageKey, STORAGE_BUCKET);
      }
    }

    await prisma.printTemplate.deleteMany({
      where: {
        createdAt: {
          lt: oneDayAgo,
        },
      },
    });

    const template = await prisma.printTemplate.create({
      data: {
        name: name.trim(),
        filePath: url,
        storageProvider: 'supabase',
        storageKey,
        storageUrl: url,
        meta: JSON.stringify({
          dpi: 300,
          cols: 1,
          rows: 8,
          qr: { xMm: 150, yMm: 230, widthMm: 30, rotationDeg: 0 },
        }),
      },
    });

    return apiOk(template);
  } catch (err: any) {
    console.error('Error al subir la plantilla:', err);
    return apiError('INTERNAL_ERROR', 'Error interno', { message: err?.message || String(err) }, 500);
  }
}
