import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import { getReservation } from '@/lib/birthdays/service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const adminCookie = getSessionCookieFromRequest(req as unknown as Request);
  const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
  const adminSession = await verifySessionCookie(adminCookie);
  const userSession = await verifyUserSessionCookie(userCookie);
  const session = adminSession || userSession;
  if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
  // Allow ADMIN/STAFF from admin session, or COLLAB/STAFF from user session
  const isAdmin = adminSession?.role && ['ADMIN', 'STAFF'].includes(adminSession.role);
  const isUser = userSession?.role && ['COLLAB', 'STAFF'].includes(userSession.role);
  if (!isAdmin && !isUser) return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

  const id = params.id;
  const r = await getReservation(id);
  if (!r) return apiError('NOT_FOUND', 'Reservation not found', undefined, 404);
  return apiOk(r);
}
