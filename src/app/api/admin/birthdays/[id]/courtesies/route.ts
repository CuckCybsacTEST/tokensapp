import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { setCourtesyStatus } from '@/lib/birthdays/service';

const BodySchema = z.object({
  type: z.string().min(1),
  status: z.enum(['pending', 'delivered']).default('pending'),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN', 'STAFF']);
  if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);

  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400);

  const item = await setCourtesyStatus(params.id, parsed.data.type, parsed.data.status, session?.role);
  return apiOk(item);
}
