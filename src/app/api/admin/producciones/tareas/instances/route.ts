export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

export async function GET(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError('UNAUTHORIZED', 'No autorizado', undefined, 401);

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const taskId = url.searchParams.get('taskId');

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.scheduledFor = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (taskId) where.taskId = taskId;

  const instances = await prisma.recurringTaskInstance.findMany({
    where,
    include: {
      task: {
        include: {
          defaultAssignees: { include: { person: { select: { id: true, name: true, area: true } } } },
        },
      },
      completedBy: { select: { id: true, username: true, person: { select: { name: true } } } },
      production: { select: { id: true, title: true, status: true } },
    },
    orderBy: { scheduledFor: 'asc' },
  });

  return apiOk({ instances });
}
