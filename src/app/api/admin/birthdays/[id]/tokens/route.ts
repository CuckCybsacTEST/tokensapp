import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { generateInviteTokens, listTokens } from '@/lib/birthdays/service';
import { z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN', 'STAFF']);
  if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);
  const tokens = await listTokens(params.id);
  return apiOk({ items: tokens });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN', 'STAFF']);
  if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);
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
