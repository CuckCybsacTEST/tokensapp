import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import { generateInviteTokens, listTokens } from '@/lib/birthdays/service';
import { z } from 'zod';

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
  const tokens = await listTokens(params.id);
  return apiOk({ items: tokens });
}

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
  const { searchParams } = new URL(req.url);
  const schema = z.object({
    force: z.union([z.literal('1'), z.literal('true')]).optional(),
    expectedUpdatedAt: z.string().optional(),
  });
  const parsed = schema.safeParse({
    force: searchParams.get('force') || undefined,
    expectedUpdatedAt: searchParams.get('expectedUpdatedAt') || undefined,
  });
  if (!parsed.success) return apiError('INVALID_QUERY', 'Validation failed', parsed.error.flatten(), 400);
  const force = Boolean(parsed.data.force);
  const expectedUpdatedAt = parsed.data.expectedUpdatedAt;
  const tokens = await generateInviteTokens(params.id, { force, expectedUpdatedAt }, session?.role);
  return apiOk({ items: tokens });
}
