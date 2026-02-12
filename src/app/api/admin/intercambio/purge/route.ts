export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = 'exchange-media';

/**
 * Extract Supabase storage paths from public URLs
 */
function extractSupabasePaths(urls: string[]): string[] {
  const paths: string[] = [];
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)/);
      if (match && match[1]) {
        paths.push(decodeURIComponent(match[1]));
      }
    } catch {
      // Skip invalid URLs
    }
  }
  return paths;
}

/**
 * Delete images from Supabase Storage in batches
 */
async function deleteImagesFromSupabase(imagePaths: string[]): Promise<{ deleted: number; errors: string[] }> {
  if (!supabaseUrl || !supabaseServiceKey || imagePaths.length === 0) {
    return { deleted: 0, errors: [] };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const BATCH_SIZE = 10;
  let deleted = 0;
  const errors: string[] = [];

  for (let i = 0; i < imagePaths.length; i += BATCH_SIZE) {
    const batch = imagePaths.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(batch);
    if (error) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
    } else {
      deleted += data?.length || batch.length;
    }
  }

  return { deleted, errors };
}

/**
 * POST /api/admin/intercambio/purge
 * Purge exchange records and their Supabase media
 *
 * Body: {
 *   purgeOrphansOnly?: boolean   — delete exchanges without a batch
 *   batchIds?: string[]          — delete by specific batch IDs
 *   statusFilter?: string        — only delete exchanges with this status
 *   dryRun?: boolean             — preview what would be deleted
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const body = await req.json();
    const { purgeOrphansOnly, batchIds, statusFilter, dryRun } = body;

    let exchangeWhere: any = {};

    if (purgeOrphansOnly) {
      exchangeWhere.batchId = null;
    } else if (batchIds && Array.isArray(batchIds) && batchIds.length > 0) {
      exchangeWhere.batchId = { in: batchIds };
    } else {
      return apiError('BAD_REQUEST', 'Especificar purgeOrphansOnly o batchIds', undefined, 400);
    }

    if (statusFilter) {
      exchangeWhere.status = statusFilter;
    }

    // Collect all media URLs before deleting
    const exchanges = await (prisma as any).clientExchange.findMany({
      where: exchangeWhere,
      include: { media: true }
    });

    const mediaUrls: string[] = [];
    let mediaCount = 0;
    for (const ex of exchanges) {
      for (const m of (ex.media || [])) {
        mediaCount++;
        if (m.imageUrl) mediaUrls.push(m.imageUrl);
        if (m.originalImageUrl) mediaUrls.push(m.originalImageUrl);
        if (m.thumbnailUrl) mediaUrls.push(m.thumbnailUrl);
      }
    }

    const storagePaths = extractSupabasePaths(mediaUrls);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        exchangeCount: exchanges.length,
        mediaRecordCount: mediaCount,
        storageFileCount: storagePaths.length,
        batchesAffected: purgeOrphansOnly ? 0 : (batchIds?.length || 0),
      });
    }

    // Delete from Supabase storage
    const storageResult = await deleteImagesFromSupabase(storagePaths);

    // Delete exchange records (cascade deletes media records)
    const exchangeIds = exchanges.map((e: any) => e.id);

    // Delete media records first
    await (prisma as any).clientExchangeMedia.deleteMany({
      where: { exchangeId: { in: exchangeIds } }
    });

    // Delete exchanges
    const deleteResult = await (prisma as any).clientExchange.deleteMany({
      where: { id: { in: exchangeIds } }
    });

    // Delete batches if batch IDs provided and not orphan-only
    let batchesDeleted = 0;
    if (!purgeOrphansOnly && batchIds && batchIds.length > 0) {
      const batchResult = await (prisma as any).clientExchangeBatch.deleteMany({
        where: { id: { in: batchIds } }
      });
      batchesDeleted = batchResult.count;
    }

    return NextResponse.json({
      ok: true,
      exchangesDeleted: deleteResult.count,
      mediaRecordsDeleted: mediaCount,
      storageFilesDeleted: storageResult.deleted,
      storageErrors: storageResult.errors,
      batchesDeleted,
    });
  } catch (error: any) {
    console.error('[intercambio/purge] Error:', error);
    return apiError('INTERNAL_ERROR', 'Error en purga', undefined, 500);
  }
}
