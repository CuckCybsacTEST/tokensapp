export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';
import { ImageOptimizer } from '@/lib/image-optimizer';

// In-memory rate limiter for exchange uploads
const uploadLimits = new Map<string, { count: number; window: number }>();
const UPLOAD_LIMIT = 10; // max uploads per window
const UPLOAD_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkUploadRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = Math.floor(now / UPLOAD_WINDOW_MS);
  const key = `upload:${ip}`;
  const entry = uploadLimits.get(key);
  if (!entry || entry.window !== window) {
    uploadLimits.set(key, { count: 1, window });
    return true;
  }
  if (entry.count >= UPLOAD_LIMIT) return false;
  entry.count++;
  return true;
}

/**
 * POST /api/exchange/upload
 * Public endpoint — upload media (photo/video) for a client exchange
 * Accepts multipart form with:
 *   - file: the media file
 *   - batchId: optional batch id (to look up policy)
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    if (!checkUploadRateLimit(ip)) {
      return apiError('TOO_MANY_REQUESTS', 'Demasiadas subidas. Intenta de nuevo más tarde.', undefined, 429);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const batchId = formData.get('batchId') as string | null;

    if (!file) {
      return apiError('BAD_REQUEST', 'Archivo requerido', undefined, 400);
    }

    // Look up active policy
    let policy: any = null;
    if (batchId) {
      const batch = await (prisma as any).clientExchangeBatch.findUnique({
        where: { id: batchId }
      });
      if (batch?.policyId) {
        policy = await (prisma as any).clientExchangePolicy.findUnique({
          where: { id: batch.policyId }
        });
      }
    }
    if (!policy) {
      policy = await (prisma as any).clientExchangePolicy.findFirst({
        where: { isActive: true },
        orderBy: { isDefault: 'desc' }
      });
    }

    const isVideo = file.type.startsWith('video/');
    const buffer = Buffer.from(await file.arrayBuffer());

    if (isVideo) {
      // Video handling — validate size, store directly
      const maxVideoSize = policy?.maxVideoSize || 31457280; // 30MB default
      if (buffer.length > maxVideoSize) {
        return apiError('BAD_REQUEST', `El video es demasiado grande. Máximo ${Math.round(maxVideoSize / 1048576)}MB`, undefined, 400);
      }

      const allowedFormats = (policy?.allowedVideoFormats || 'mp4,webm,mov').split(',');
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedFormats.includes(ext) && !allowedFormats.some((f: string) => file.type.includes(f))) {
        return apiError('BAD_REQUEST', `Formato de video no permitido. Formatos: ${allowedFormats.join(', ')}`, undefined, 400);
      }

      // Upload video directly to Supabase
      const { supabaseAdmin } = await import('@/lib/supabase');
      const timestamp = Date.now();
      const crypto = await import('crypto');
      const randomHex = crypto.randomBytes(8).toString('hex');
      const videoFilename = `${timestamp}-${randomHex}.${ext || 'mp4'}`;

      const { data, error } = await supabaseAdmin.storage
        .from('exchange-media')
        .upload(`videos/${videoFilename}`, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('[exchange/upload] Error uploading video:', error);
        return apiError('INTERNAL_ERROR', 'Error subiendo video', undefined, 500);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('exchange-media')
        .getPublicUrl(`videos/${videoFilename}`);

      return NextResponse.json({
        mediaType: 'video',
        imageUrl: urlData.publicUrl,
        originalImageUrl: urlData.publicUrl,
        thumbnailUrl: null,
        filename: videoFilename,
        metadata: { size: buffer.length, format: ext, type: file.type }
      });
    } else {
      // Image handling — validate, optimize, save 3 variants
      const policyForValidation = {
        maxImageSize: policy?.maxMediaSize || 5242880,
        allowedFormats: (policy?.allowedMediaFormats || 'jpg,jpeg,png,webp').split(','),
        maxWidth: policy?.maxMediaWidth || 1200,
        maxHeight: policy?.maxMediaHeight || 1200,
      };

      const validation = await ImageOptimizer.validateImage(buffer, policyForValidation);
      if (!validation.valid) {
        return apiError('BAD_REQUEST', validation.error || 'Imagen inválida', undefined, 400);
      }

      const quality = policy?.mediaQuality || 80;
      const maxWidth = policy?.maxMediaWidth || 1200;
      const maxHeight = policy?.maxMediaHeight || 1200;

      // Optimize
      const optimizeResult = await ImageOptimizer.optimizeImage(buffer, {
        quality,
        maxWidth,
        maxHeight,
        format: 'webp',
      });

      // Save to Supabase under exchange-media bucket
      const { supabaseAdmin } = await import('@/lib/supabase');
      const timestamp = Date.now();
      const crypto = await import('crypto');
      const randomHex = crypto.randomBytes(8).toString('hex');
      const baseName = `${timestamp}-${randomHex}`;

      // Upload original
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const { error: origErr } = await supabaseAdmin.storage
        .from('exchange-media')
        .upload(`original/${baseName}.${ext}`, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });
      if (origErr) console.error('[exchange/upload] Error uploading original:', origErr);

      const { data: origUrl } = supabaseAdmin.storage
        .from('exchange-media')
        .getPublicUrl(`original/${baseName}.${ext}`);

      // Upload optimized
      const { error: optErr } = await supabaseAdmin.storage
        .from('exchange-media')
        .upload(`optimized/${baseName}.webp`, optimizeResult.optimizedBuffer, {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: false,
        });
      if (optErr) console.error('[exchange/upload] Error uploading optimized:', optErr);

      const { data: optUrl } = supabaseAdmin.storage
        .from('exchange-media')
        .getPublicUrl(`optimized/${baseName}.webp`);

      // Upload thumbnail
      const thumbnail = await ImageOptimizer.createThumbnail(buffer);
      const { error: thumbErr } = await supabaseAdmin.storage
        .from('exchange-media')
        .upload(`thumbnail/${baseName}_thumb.webp`, thumbnail, {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: false,
        });
      if (thumbErr) console.error('[exchange/upload] Error uploading thumbnail:', thumbErr);

      const { data: thumbUrl } = supabaseAdmin.storage
        .from('exchange-media')
        .getPublicUrl(`thumbnail/${baseName}_thumb.webp`);

      return NextResponse.json({
        mediaType: 'image',
        imageUrl: optUrl.publicUrl,
        originalImageUrl: origUrl.publicUrl,
        thumbnailUrl: thumbUrl.publicUrl,
        filename: `${baseName}.webp`,
        metadata: {
          originalSize: buffer.length,
          optimizedSize: optimizeResult.optimizedBuffer.length,
          width: optimizeResult.metadata.optimizedWidth,
          height: optimizeResult.metadata.optimizedHeight,
          format: 'webp'
        }
      });
    }
  } catch (error: any) {
    console.error('[exchange/upload] Error:', error);
    return apiError('INTERNAL_ERROR', 'Error procesando archivo', undefined, 500);
  }
}
