import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getById } from '@/lib/shows/service';
import { processShowImage } from '@/lib/shows/imagePipeline';
import { invalidateShowsCache } from '@/lib/shows/cache';
import { isShowsFeatureEnabled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

function buildErrorResponse(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function adminFullShape(show: any) {
  const hasImage = !!(show.imageWebpPath && show.imageWebpPath.trim() !== '' && show.width > 0 && show.height > 0);
  return {
    id: show.id,
    title: show.title,
    slug: show.slug,
    status: show.status,
    startsAt: show.startsAt.toISOString(),
    endsAt: show.endsAt ? show.endsAt.toISOString() : null,
    slot: show.slot,
    publishedAt: show.publishedAt ? show.publishedAt.toISOString() : null,
    createdAt: show.createdAt.toISOString(),
    updatedAt: show.updatedAt.toISOString(),
    imageOriginalPath: show.imageOriginalPath,
    imageWebpPath: show.imageWebpPath,
    imageBlurData: show.imageBlurData,
    width: show.width,
    height: show.height,
    bytesOriginal: show.bytesOriginal,
    bytesOptimized: show.bytesOptimized,
    hasImage,
    isExpired: !!(show.endsAt && show.endsAt.getTime() < Date.now()),
  };
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // In-memory concurrency guard map (global across requests in same process)
  const g: any = globalThis as any;
  if (!g.__showsImageLocks) g.__showsImageLocks = new Map<string, number>();
  const locks: Map<string, number> = g.__showsImageLocks;
  const key = params.id;
  try {
    if (!isShowsFeatureEnabled()) return buildErrorResponse('FEATURE_DISABLED', 'Shows feature disabled', 503);
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) {
      if (session && (session as any).role === 'STAFF') return buildErrorResponse('FORBIDDEN', 'Only ADMIN can mutate', 403);
      return buildErrorResponse('UNAUTHORIZED', 'ADMIN required', 401);
    }

    if (locks.has(key)) {
      return buildErrorResponse('IMAGE_IN_PROGRESS', 'Image processing already in progress for this show', 409);
    }
    locks.set(key, Date.now());

    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      locks.delete(key);
      return buildErrorResponse('MISSING_FILE', 'file field required', 400);
    }

    // Ensure show exists to provide proper 404 before processing
    const before = await getById(params.id);

    let meta;
    try {
      meta = await processShowImage(params.id, file, { actorRole: (session as any)?.role });
    } finally {
      locks.delete(key); // always release lock
    }
    const after = await getById(params.id);

    if (after.status === 'PUBLISHED') invalidateShowsCache();

    return NextResponse.json({ ok: true, meta, show: adminFullShape(after) });
  } catch (e: any) {
    // Ensure lock is cleared on unexpected errors
    locks.delete(key);
    const code = e?.code || 'INTERNAL';
    const http = e?.http || (code === 'NOT_FOUND' ? 404 : code === 'ARCHIVED_IMMUTABLE' ? 409 : 500);
    const message = e?.message || String(e);
    return buildErrorResponse(code, message, http);
  }
}
