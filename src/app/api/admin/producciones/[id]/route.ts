export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

const VALID_STATUSES = ['IDEA','BRIEFED','SCHEDULED','IN_PRODUCTION','IN_EDITING','IN_REVIEW','APPROVED','PUBLISHED','CANCELLED'] as const;
const VALID_PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'] as const;

// Valid status transitions — each status maps to which statuses it can move to
const STATUS_FLOW: Record<string, string[]> = {
  IDEA:          ['BRIEFED', 'CANCELLED'],
  BRIEFED:       ['SCHEDULED', 'CANCELLED'],
  SCHEDULED:     ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['IN_EDITING', 'CANCELLED'],
  IN_EDITING:    ['IN_REVIEW', 'CANCELLED'],
  IN_REVIEW:     ['APPROVED', 'IN_EDITING', 'CANCELLED'],  // Can go back to editing
  APPROVED:      ['PUBLISHED', 'CANCELLED'],
  PUBLISHED:     [],
  CANCELLED:     ['IDEA'],  // Reopen
};

async function resolvePersonIdForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { personId: true } });
  return user?.personId ?? null;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError(r.error || 'UNAUTHORIZED', r.error, undefined, 401);

  const production = await prisma.production.findUnique({
    where: { id: params.id },
    include: {
      requestedBy: { select: { id: true, username: true, person: { select: { name: true } } } },
      assignedTo: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, username: true, person: { select: { name: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
      links: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!production) return apiError('NOT_FOUND', 'Producción no encontrada', undefined, 404);
  return apiOk({ production });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError(r.error || 'UNAUTHORIZED', r.error, undefined, 401);

  const existing = await prisma.production.findUnique({ where: { id: params.id } });
  if (!existing) return apiError('NOT_FOUND', 'Producción no encontrada', undefined, 404);

  const isAdmin = session!.role === 'ADMIN' || session!.role === 'COORDINATOR';

  // STAFF can only modify productions they are assigned to or requested
  if (!isAdmin) {
    const myPersonId = await resolvePersonIdForUser(session!.userId);
    const isAssigned = myPersonId && existing.assignedToId === myPersonId;
    const isRequester = existing.requestedById === session!.userId;
    if (!isAssigned && !isRequester) {
      return apiError('FORBIDDEN', 'Solo puedes modificar producciones asignadas a ti o que solicitaste', undefined, 403);
    }
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON', 'Body inválido', undefined, 400); }

  const data: Record<string, unknown> = {};

  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
  if (typeof body.type === 'string') data.type = body.type;
  if (typeof body.priority === 'string' && VALID_PRIORITIES.includes(body.priority as any)) data.priority = body.priority;
  if (typeof body.objective === 'string') data.objective = body.objective || null;
  if (typeof body.context === 'string') data.context = body.context || null;
  if (typeof body.message === 'string') data.message = body.message || null;
  if (typeof body.references === 'string') data.references = body.references || null;
  if (typeof body.targetAudience === 'string') data.targetAudience = body.targetAudience || null;
  if (typeof body.platform === 'string') data.platform = body.platform || null;
  if (typeof body.format === 'string') data.format = body.format || null;
  if (typeof body.duration === 'string') data.duration = body.duration || null;
  if (typeof body.deliverables === 'string') data.deliverables = body.deliverables || null;
  if (typeof body.notes === 'string') data.notes = body.notes || null;
  if (typeof body.tags === 'string') data.tags = body.tags || null;
  if (typeof body.publishUrl === 'string') data.publishUrl = body.publishUrl || null;
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline as string) : null;
  if (body.scheduledDate !== undefined) data.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate as string) : null;

  // Status changes with flow validation + automatic timestamps
  if (typeof body.status === 'string' && VALID_STATUSES.includes(body.status as any)) {
    const newStatus = body.status as string;
    const allowed = STATUS_FLOW[existing.status] ?? [];

    // ADMIN/COORDINATOR can skip flow, STAFF must follow it
    if (!isAdmin && !allowed.includes(newStatus)) {
      return apiError('INVALID_TRANSITION', `No puedes pasar de ${existing.status} a ${newStatus}`, undefined, 400);
    }

    // Only ADMIN/COORDINATOR can approve or publish
    if (!isAdmin && (newStatus === 'APPROVED' || newStatus === 'PUBLISHED')) {
      return apiError('FORBIDDEN', 'Solo admin/coordinador puede aprobar o publicar', undefined, 403);
    }

    data.status = newStatus;
    if (newStatus === 'APPROVED' || newStatus === 'PUBLISHED') {
      data.completedAt = existing.completedAt ?? new Date();
    }
    if (newStatus === 'PUBLISHED') {
      data.publishedAt = existing.publishedAt ?? new Date();
    }
  }

  const updated = await prisma.production.update({ where: { id: params.id }, data });
  return apiOk({ production: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN']);
  if (!r.ok) return apiError(r.error || 'UNAUTHORIZED', r.error, undefined, r.error === 'FORBIDDEN' ? 403 : 401);

  const existing = await prisma.production.findUnique({ where: { id: params.id } });
  if (!existing) return apiError('NOT_FOUND', 'Producción no encontrada', undefined, 404);

  await prisma.production.delete({ where: { id: params.id } });
  return apiOk({ deleted: true });
}
