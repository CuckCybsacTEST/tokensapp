export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

/** Endpoint to quickly list persons for assignment dropdown */
export async function GET(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError(r.error || 'UNAUTHORIZED', r.error, undefined, 401);

  const persons = await prisma.person.findMany({
    where: { active: true },
    select: { id: true, name: true, area: true, jobTitle: true },
    orderBy: { name: 'asc' },
  });

  return apiOk({ persons });
}
