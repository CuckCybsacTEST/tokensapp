import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { createDraft, listAdmin } from '@/lib/shows/service';
import { isShowsFeatureEnabled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

function buildErrorResponse(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function parseJson(body: string | null): any {
  if (!body) return {};
  try { return JSON.parse(body); } catch { throw Object.assign(new Error('Invalid JSON'), { code: 'INVALID_JSON', http: 400 }); }
}

function adminShape(show: any) {
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
    hasImage: !!(show.imageWebpPath && show.imageWebpPath.trim() !== '' && show.width > 0 && show.height > 0),
    details: show.details || null,
    specialGuests: show.specialGuests || null,
    notes: show.notes || null,
  };
}

export async function POST(req: Request) {
  try {
    if (!isShowsFeatureEnabled()) return buildErrorResponse('FEATURE_DISABLED', 'Shows feature disabled', 503);
    // Auth & role check
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) {
      // STAFF no puede crear; devolver 403 si está autenticado como STAFF
      if (session && (session as any).role === 'STAFF') return buildErrorResponse('FORBIDDEN', 'Only ADMIN can mutate', 403);
      return buildErrorResponse('UNAUTHORIZED', 'ADMIN required', 401);
    }

    const json = parseJson(await req.text());
    const input = {
      title: String(json.title || ''),
      slug: json.slug != null ? String(json.slug) : undefined,
      startsAt: json.startsAt || new Date().toISOString(),
      endsAt: json.endsAt || undefined,
      slot: json.slot != null ? Number(json.slot) : undefined,
    };

  const show = await createDraft(input, { actorRole: (session as any)?.role });
    return NextResponse.json({ ok: true, show: adminShape(show) }, { status: 201 });
  } catch (e: any) {
    const code = e?.code || 'INTERNAL';
    const http = e?.http || (code === 'INVALID_JSON' ? 400 : 500);
    const message = e?.message || String(e);
    return buildErrorResponse(code, message, http);
  }
}

export async function GET(req: Request) {
  try {
    if (!isShowsFeatureEnabled()) return buildErrorResponse('FEATURE_DISABLED', 'Shows feature disabled', 503);
    const url = new URL(req.url);
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) return buildErrorResponse(auth.error || 'UNAUTHORIZED', 'ADMIN or STAFF required', auth.error === 'UNAUTHORIZED' ? 401 : 403);

    const qp = url.searchParams;
    const filters = {
      status: qp.get('status') || undefined,
      search: qp.get('search') || undefined,
      slot: qp.get('slot') ? Number(qp.get('slot')) : undefined,
      hasImage: qp.get('hasImage') ? qp.get('hasImage') === 'true' : undefined,
      from: qp.get('from') || undefined,
      to: qp.get('to') || undefined,
      page: qp.get('page') ? Number(qp.get('page')) : undefined,
      pageSize: qp.get('pageSize') ? Number(qp.get('pageSize')) : undefined,
      order: (qp.get('order') as any) || undefined,
    } as any;

    const res = await listAdmin(filters);
    const now = Date.now();
    return NextResponse.json({
      ok: true,
      page: res.page,
      pageSize: res.pageSize,
      total: res.total,
      shows: res.items.map((s: any) => ({
        ...adminShape(s),
        isExpired: !!(s.endsAt && new Date(s.endsAt).getTime() < now),
      })),
    });
  } catch (e: any) {
    const code = e?.code || 'INTERNAL';
    const http = e?.http || 500;
    const message = e?.message || String(e);
    return buildErrorResponse(code, message, http);
  }
}
