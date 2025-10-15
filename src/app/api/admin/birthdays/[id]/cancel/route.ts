import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import { cancelReservation } from '@/lib/birthdays/service';

const BodySchema = z.object({ reason: z.string().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400);

  const r = await cancelReservation(params.id, parsed.data.reason, session?.role);
  return apiOk(r);
}
