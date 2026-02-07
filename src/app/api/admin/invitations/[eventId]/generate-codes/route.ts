import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { generateInvitationCodes } from '@/lib/invitations/service';

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF'].includes(session.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === '1';

    const invitations = await generateInvitationCodes(params.eventId, { force });
    return apiOk({ ok: true, invitations, count: invitations.length });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('EVENT_NOT_FOUND')) return apiError('EVENT_NOT_FOUND', 'Event not found', undefined, 404);
    return apiError('GENERATE_CODES_ERROR', msg, undefined, 500);
  }
}
