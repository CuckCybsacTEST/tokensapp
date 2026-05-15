export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED'] as const;

export async function PATCH(req: Request, { params }: { params: { iid: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError('UNAUTHORIZED', 'No autorizado', undefined, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON', 'Body inválido', undefined, 400); }

  const status = body.status as string;
  if (!VALID_STATUSES.includes(status as any)) return apiError('INVALID_STATUS', 'Estado inválido', undefined, 400);

  const instance = await prisma.recurringTaskInstance.update({
    where: { id: params.iid },
    data: {
      status: status as any,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : undefined,
      completedAt: status === 'DONE' ? new Date() : status === 'PENDING' || status === 'IN_PROGRESS' ? null : undefined,
      completedById: status === 'DONE' ? session!.userId : status === 'PENDING' || status === 'IN_PROGRESS' ? null : undefined,
    },
    include: {
      task: { select: { id: true, name: true } },
      completedBy: { select: { id: true, username: true, person: { select: { name: true } } } },
    },
  });

  return apiOk({ instance });
}
