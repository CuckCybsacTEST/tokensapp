import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { attachPhoto } from '@/lib/birthdays/service';

const BodySchema = z.object({
  kind: z.string().default('group'),
  status: z.enum(['pending', 'ready', 'sent']).default('pending'),
  url: z.string().url().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN', 'STAFF']);
  if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);

  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400);

  const item = await attachPhoto(params.id, parsed.data, session?.role);
  return apiOk(item);
}
