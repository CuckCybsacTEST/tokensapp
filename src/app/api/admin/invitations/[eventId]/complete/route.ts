import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { completeEvent } from '@/lib/invitations/service';

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF'].includes(session.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const event = await completeEvent(params.eventId);
    return apiOk({ ok: true, event });
  } catch (e: any) {
    return apiError('COMPLETE_ERROR', String(e?.message || e), undefined, 500);
  }
}
