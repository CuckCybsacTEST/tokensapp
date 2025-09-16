import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { completeReservation } from '@/lib/birthdays/service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN', 'STAFF']);
  if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);
  const id = params.id;
  const r = await completeReservation(id, session?.role);
  return apiOk(r);
}
