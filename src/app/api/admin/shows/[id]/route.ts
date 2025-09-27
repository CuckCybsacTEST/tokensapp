import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getById, updatePartial } from '@/lib/shows/service';
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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (!isShowsFeatureEnabled()) return buildErrorResponse('FEATURE_DISABLED', 'Shows feature disabled', 503);
    const raw = getSessionCookieFromRequest(_req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) return buildErrorResponse(auth.error || 'UNAUTHORIZED', 'ADMIN or STAFF required', auth.error === 'UNAUTHORIZED' ? 401 : 403);

    const show = await getById(params.id);
    return NextResponse.json({ ok: true, show: adminFullShape(show) });
  } catch (e: any) {
    const code = e?.code || 'INTERNAL';
    const http = e?.http || (code === 'NOT_FOUND' ? 404 : 500);
    const message = e?.message || String(e);
    return buildErrorResponse(code, message, http);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!isShowsFeatureEnabled()) return buildErrorResponse('FEATURE_DISABLED', 'Shows feature disabled', 503);
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) {
      if (session && (session as any).role === 'STAFF') return buildErrorResponse('FORBIDDEN', 'Only ADMIN can mutate', 403);
      return buildErrorResponse('UNAUTHORIZED', 'ADMIN required', 401);
    }

    const before = await getById(params.id); // captura estado previo

    const bodyText = await req.text();
    let json: any = {};
    if (bodyText) {
      try { json = JSON.parse(bodyText); } catch { return buildErrorResponse('INVALID_JSON', 'Invalid JSON', 400); }
    }

    const patch: any = {};
    if ('title' in json) patch.title = json.title;
    if ('slug' in json) patch.slug = json.slug;
    if ('startsAt' in json) patch.startsAt = json.startsAt;
    if ('endsAt' in json) patch.endsAt = json.endsAt;
    if ('slot' in json) patch.slot = json.slot;

    const updated = await updatePartial(params.id, patch);

    // Invalidate public cache if published and changed visible fields
    if (before.status === 'PUBLISHED') {
      const changed = (
        before.title !== updated.title ||
        before.slug !== updated.slug ||
        before.startsAt.getTime() !== updated.startsAt.getTime() ||
        (before.endsAt?.getTime() || 0) !== (updated.endsAt?.getTime() || 0) ||
        before.slot !== updated.slot
      );
      if (changed) {
        invalidateShowsCache();
      }
    }

    return NextResponse.json({ ok: true, show: adminFullShape(updated) });
  } catch (e: any) {
    const code = e?.code || 'INTERNAL';
    const http = e?.http || (code === 'SLUG_LOCKED' ? 409 : code === 'NOT_FOUND' ? 404 : 500);
    const message = e?.message || String(e);
    return buildErrorResponse(code, message, http);
  }
}
