export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

const VALID_TYPES = ['VIDEO_REEL','VIDEO_TIKTOK','VIDEO_PROMO','VIDEO_RECAP','PHOTO_SESSION','PHOTO_PRODUCT','PHOTO_STAFF','DESIGN_GRAPHIC','OTHER'] as const;
const VALID_RECURRENCES = ['DAILY','WEEKLY','BIWEEKLY','MONTHLY'] as const;
const VALID_PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'] as const;

export async function GET(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError('UNAUTHORIZED', 'No autorizado', undefined, 401);

  const tasks = await prisma.recurringTask.findMany({
    include: {
      defaultAssignees: { include: { person: { select: { id: true, name: true, area: true } } } },
      _count: { select: { instances: true } },
    },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });

  return apiOk({ tasks });
}

export async function POST(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR']);
  if (!r.ok) return apiError('FORBIDDEN', 'Solo coordinadores o admins pueden crear tareas', undefined, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON', 'Body inválido', undefined, 400); }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return apiError('NAME_REQUIRED', 'El nombre es obligatorio', undefined, 400);

  const type = body.type as string;
  if (!VALID_TYPES.includes(type as any)) return apiError('INVALID_TYPE', 'Tipo inválido', undefined, 400);

  const recurrence = body.recurrence as string;
  if (!VALID_RECURRENCES.includes(recurrence as any)) return apiError('INVALID_RECURRENCE', 'Recurrencia inválida', undefined, 400);

  const priority = (body.defaultPriority as string) || 'MEDIUM';
  if (!VALID_PRIORITIES.includes(priority as any)) return apiError('INVALID_PRIORITY', 'Prioridad inválida', undefined, 400);

  const assigneeIds: string[] = Array.isArray(body.assigneeIds) ? body.assigneeIds.filter((x): x is string => typeof x === 'string') : [];

  const task = await prisma.recurringTask.create({
    data: {
      name,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      type: type as any,
      platform: typeof body.platform === 'string' ? body.platform.trim() || null : null,
      format: typeof body.format === 'string' ? body.format.trim() || null : null,
      deliverables: typeof body.deliverables === 'string' ? body.deliverables.trim() || null : null,
      recurrence: recurrence as any,
      daysOfWeek: typeof body.daysOfWeek === 'string' ? body.daysOfWeek.trim() || null : null,
      dayOfMonth: typeof body.dayOfMonth === 'number' ? body.dayOfMonth : null,
      defaultPriority: priority as any,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      defaultAssignees: assigneeIds.length > 0 ? {
        create: assigneeIds.map((personId) => ({ personId })),
      } : undefined,
    },
    include: {
      defaultAssignees: { include: { person: { select: { id: true, name: true, area: true } } } },
    },
  });

  return apiOk({ task }, 201);
}
