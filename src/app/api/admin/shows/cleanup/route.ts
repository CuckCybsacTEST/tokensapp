import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { cleanupExpiredShows } from '@/lib/shows/service';
import { isShowsFeatureEnabled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

function buildErrorResponse(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function POST(req: Request) {
  try {
    if (!isShowsFeatureEnabled()) return buildErrorResponse('FEATURE_DISABLED', 'Shows feature disabled', 503);
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) return buildErrorResponse('UNAUTHORIZED', 'ADMIN required', 401);

    const result = await cleanupExpiredShows({ actorRole: (session as any)?.role });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    const code = e?.code || 'INTERNAL';
    const http = e?.http || 500;
    const message = e?.message || String(e);
    return buildErrorResponse(code, message, http);
  }
}