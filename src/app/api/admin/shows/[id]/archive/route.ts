import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { archive, getById } from '@/lib/shows/service';
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
  try {
    if (!isShowsFeatureEnabled()) return buildErrorResponse('FEATURE_DISABLED', 'Shows feature disabled', 503);
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) {
      if (session && (session as any).role === 'STAFF') return buildErrorResponse('FORBIDDEN', 'Only ADMIN can mutate', 403);
      return buildErrorResponse('UNAUTHORIZED', 'ADMIN required', 401);
    }

    // Capture pre-status (if exists)
    const before = await getById(params.id); // throws 404 if not found
    const wasPublished = before.status === 'PUBLISHED';

  const show = await archive(params.id, { actorRole: (session as any)?.role });

    if (wasPublished) invalidateShowsCache();

    return NextResponse.json({ ok: true, show: adminFullShape(show) });
  } catch (e: any) {
    const code = e?.code || 'INTERNAL';
    const http = e?.http || (code === 'NOT_FOUND' ? 404 : 500);
    const message = e?.message || String(e);
    return buildErrorResponse(code, message, http);
  }
}
