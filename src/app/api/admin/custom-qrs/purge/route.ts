import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl!, supabaseServiceKey) : null;
const STORAGE_BUCKET = 'qr-images';

function err(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

// Extraer paths de Supabase de URLs públicas
function extractSupabasePaths(urls: string[]): string[] {
  const paths: string[] = [];

  for (const url of urls) {
    if (!url || typeof url !== 'string') continue;

    try {
      // URL típica: https://upmqzhfnigsihpcclsao.supabase.co/storage/v1/object/public/qr-images/original/filename.jpg
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)/);
      if (pathMatch && pathMatch[1]) {
        paths.push(pathMatch[1]);
      }
    } catch (error) {
      // URL malformada, ignorar
      console.warn('Invalid Supabase URL:', url);
    }
  }

  return paths;
}

// Eliminar imágenes de Supabase Storage en lotes
async function deleteImagesFromSupabase(imagePaths: string[]): Promise<{ deleted: number; errors: string[] }> {
  if (!supabaseAdmin || imagePaths.length === 0) {
    return { deleted: 0, errors: [] };
  }

  const BATCH_SIZE = 10;
  let deleted = 0;
  const errors: string[] = [];

  for (let i = 0; i < imagePaths.length; i += BATCH_SIZE) {
    const batch = imagePaths.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove(batch);

      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        deleted += batch.length;
      }
    } catch (error: any) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message || 'Unknown error'}`);
    }
  }

  return { deleted, errors };
}

export async function GET(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req as any);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) return err('FORBIDDEN', 'ADMIN required', 403);

    const limit = Math.min(200, Math.max(1, parseInt((req.nextUrl.searchParams.get('limit') || '50'), 10)));
    const batches = await (prisma as any).customQrBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        qrs: {
          select: {
            redeemedAt: true,
            expiresAt: true,
            theme: true
          }
        }
      },
    });

    const rows = batches.map((b: any) => {
      const redeemed = b.qrs.filter((q: any) => q.redeemedAt).length;
      const expired = b.qrs.filter((q: any) => !q.redeemedAt && q.expiresAt < new Date()).length;
      const active = Math.max(0, b.qrs.length - redeemed - expired);
      const distinctThemes = new Set(b.qrs.map((q: any) => q.theme)).size;
      return {
        id: b.id,
        name: b.name,
        description: b.description,
        createdAt: b.createdAt,
        totalQrs: b.qrs.length,
        redeemed,
        expired,
        active,
        distinctThemes,
      };
    });

    // Contar QR huérfanos (sin lote asignado)
    const orphanQrs = await (prisma as any).customQr.findMany({
      where: { batchId: null },
      select: {
        redeemedAt: true,
        expiresAt: true,
        theme: true
      }
    });

    const orphanStats = {
      totalQrs: orphanQrs.length,
      redeemed: orphanQrs.filter((q: any) => q.redeemedAt).length,
      expired: orphanQrs.filter((q: any) => !q.redeemedAt && q.expiresAt < new Date()).length,
      active: orphanQrs.filter((q: any) => !q.redeemedAt && (!q.expiresAt || q.expiresAt >= new Date())).length,
      distinctThemes: new Set(orphanQrs.map((q: any) => q.theme)).size
    };

    return NextResponse.json({ ok: true, batches: rows, orphanStats });
  } catch (e: any) {
    return err('INTERNAL', e?.message || 'internal error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req as any);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) return err('FORBIDDEN', 'ADMIN required', 403);

    const body = await req.json().catch(() => ({}));
    const batchIds: string[] = Array.isArray(body.batchIds) ? body.batchIds.filter((x: any) => typeof x === 'string' && x.trim()) : [];
    const dryRun = !!body?.options?.dryRun;
    const purgeOrphansOnly = !!body?.options?.purgeOrphansOnly;

    if (purgeOrphansOnly) {
      // Obtener QR huérfanos con sus URLs de imágenes
      const orphanQrs = await (prisma as any).customQr.findMany({
        where: { batchId: null },
        select: {
          id: true,
          redeemedAt: true,
          expiresAt: true,
          imageUrl: true,
          originalImageUrl: true,
          thumbnailUrl: true
        }
      });

      if (dryRun) {
        const redeemed = orphanQrs.filter((q: any) => q.redeemedAt).length;
        const expired = orphanQrs.filter((q: any) => !q.redeemedAt && q.expiresAt < new Date()).length;
        return NextResponse.json({
          ok: true,
          dryRun: true,
          batchIds: [],
          summary: {
            qrCounts: [{ batchId: null, _count: { _all: orphanQrs.length } }],
            redeemed: [{ batchId: null, _count: { _all: redeemed } }],
            expired: [{ batchId: null, _count: { _all: expired } }]
          }
        });
      }

      if (!orphanQrs.length) {
        return NextResponse.json({
          ok: true,
          batchIds: [],
          deleted: { qrs: 0, images: 0 }
        });
      }

      // Extraer todas las URLs de imágenes
      const imageUrls: string[] = [];
      for (const qr of orphanQrs) {
        if (qr.imageUrl) imageUrls.push(qr.imageUrl);
        if (qr.originalImageUrl) imageUrls.push(qr.originalImageUrl);
        if (qr.thumbnailUrl) imageUrls.push(qr.thumbnailUrl);
      }

      // Eliminar imágenes de Supabase
      const { deleted: imagesDeleted, errors: imageErrors } = await deleteImagesFromSupabase(
        extractSupabasePaths(imageUrls)
      );

      // Loggear errores de eliminación de imágenes (pero no fallar la operación)
      if (imageErrors.length > 0) {
        console.warn('Errors deleting orphan QR images:', imageErrors);
      }

      // Ejecutar purga de huérfanos
      const deletedQrs = await (prisma as any).customQr.deleteMany({
        where: { batchId: null }
      });

      return NextResponse.json({
        ok: true,
        batchIds: [],
        deleted: {
          qrs: deletedQrs.count,
          images: imagesDeleted
        },
        imageErrors: imageErrors.length > 0 ? imageErrors : undefined
      });
    }

    if (!batchIds.length) return err('NO_BATCH_IDS', 'Provide batchIds[] or set options.purgeOrphansOnly');

    // Aggregations
    const redeemed = await (prisma as any).customQr.groupBy({
      by: ['batchId'],
      where: { batchId: { in: batchIds }, redeemedAt: { not: null } },
      _count: { _all: true },
    });
    const qrCounts = await (prisma as any).customQr.groupBy({
      by: ['batchId'],
      where: { batchId: { in: batchIds } },
      _count: { _all: true }
    });
    const expired = await (prisma as any).customQr.groupBy({
      by: ['batchId'],
      where: {
        batchId: { in: batchIds },
        redeemedAt: null,
        expiresAt: { lt: new Date() }
      },
      _count: { _all: true },
    });

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        batchIds,
        summary: { qrCounts, redeemed, expired }
      });
    }

    // Obtener todas las URLs de imágenes antes de eliminar los registros
    const qrsToDelete = await (prisma as any).customQr.findMany({
      where: { batchId: { in: batchIds } },
      select: {
        imageUrl: true,
        originalImageUrl: true,
        thumbnailUrl: true
      }
    });

    // Extraer todas las URLs de imágenes
    const imageUrls: string[] = [];
    for (const qr of qrsToDelete) {
      if (qr.imageUrl) imageUrls.push(qr.imageUrl);
      if (qr.originalImageUrl) imageUrls.push(qr.originalImageUrl);
      if (qr.thumbnailUrl) imageUrls.push(qr.thumbnailUrl);
    }

    // Eliminar imágenes de Supabase
    const { deleted: imagesDeleted, errors: imageErrors } = await deleteImagesFromSupabase(
      extractSupabasePaths(imageUrls)
    );

    // Loggear errores de eliminación de imágenes (pero no fallar la operación)
    if (imageErrors.length > 0) {
      console.warn('Errors deleting batch QR images:', imageErrors);
    }

    // Execute purge
    const deletedQrs = await (prisma as any).customQr.deleteMany({
      where: { batchId: { in: batchIds } }
    });
    const deletedBatches = await (prisma as any).customQrBatch.deleteMany({
      where: { id: { in: batchIds } }
    });

    return NextResponse.json({
      ok: true,
      batchIds,
      deleted: {
        qrs: deletedQrs.count,
        batches: deletedBatches.count,
        images: imagesDeleted
      },
      imageErrors: imageErrors.length > 0 ? imageErrors : undefined
    });
  } catch (e: any) {
    return err('INTERNAL', e?.message || 'internal error', 500);
  }
}