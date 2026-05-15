export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

const VALID_TYPES = ['VIDEO_REEL','VIDEO_TIKTOK','VIDEO_PROMO','VIDEO_RECAP','PHOTO_SESSION','PHOTO_PRODUCT','PHOTO_STAFF','DESIGN_GRAPHIC','OTHER'] as const;
const VALID_PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'] as const;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR']);
  if (!r.ok) return apiError('FORBIDDEN', 'Sin permiso', undefined, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON', 'Body inválido', undefined, 400); }

  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === 'string') data.description = body.description.trim() || null;
  if (typeof body.platform === 'string') data.platform = body.platform.trim() || null;
  if (typeof body.format === 'string') data.format = body.format.trim() || null;
  if (typeof body.deliverables === 'string') data.deliverables = body.deliverables.trim() || null;
  if (typeof body.notes === 'string') data.notes = body.notes.trim() || null;
  if (typeof body.active === 'boolean') data.active = body.active;
  if (typeof body.daysOfWeek === 'string') data.daysOfWeek = body.daysOfWeek.trim() || null;
  if (typeof body.dayOfMonth === 'number') data.dayOfMonth = body.dayOfMonth;

  if (body.type && VALID_TYPES.includes(body.type as any)) data.type = body.type;
  if (body.defaultPriority && VALID_PRIORITIES.includes(body.defaultPriority as any)) data.defaultPriority = body.defaultPriority;

  // Actualizar asignados: reemplazar lista completa si se manda
  const assigneeIds: string[] | undefined = Array.isArray(body.assigneeIds)
    ? body.assigneeIds.filter((x): x is string => typeof x === 'string')
    : undefined;

  const task = await prisma.recurringTask.update({
    where: { id: params.id },
    data: {
      ...data,
      ...(assigneeIds !== undefined ? {
        defaultAssignees: {
          deleteMany: {},
          create: assigneeIds.map((personId) => ({ personId })),
        },
      } : {}),
    },
    include: {
      defaultAssignees: { include: { person: { select: { id: true, name: true, area: true } } } },
    },
  });

  return apiOk({ task });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN']);
  if (!r.ok) return apiError('FORBIDDEN', 'Solo admins pueden eliminar tareas', undefined, 403);

  await prisma.recurringTask.delete({ where: { id: params.id } });
  return apiOk({ deleted: true });
}
