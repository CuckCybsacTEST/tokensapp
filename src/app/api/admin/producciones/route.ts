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
  if (!r.ok) return apiError(r.error || 'UNAUTHORIZED', r.error, undefined, 401);

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const priority = url.searchParams.get('priority');
  const assignedToId = url.searchParams.get('assignedToId');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (priority) where.priority = priority;
  if (assignedToId) where.assignedToId = assignedToId;

  const productions = await prisma.production.findMany({
    where,
    include: {
      requestedBy: { select: { id: true, username: true, person: { select: { name: true } } } },
      assignedTo: { select: { id: true, name: true } },
      _count: { select: { comments: true, links: true } },
    },
    orderBy: [{ priority: 'desc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
  });

  return apiOk({ productions });
}

const VALID_TYPES = ['VIDEO_REEL','VIDEO_TIKTOK','VIDEO_PROMO','VIDEO_RECAP','PHOTO_SESSION','PHOTO_PRODUCT','PHOTO_STAFF','DESIGN_GRAPHIC','OTHER'] as const;
const VALID_PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'] as const;
const VALID_STATUSES = ['IDEA','BRIEFED','SCHEDULED','IN_PRODUCTION','IN_EDITING','IN_REVIEW','APPROVED','PUBLISHED','CANCELLED'] as const;

export async function POST(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError(r.error || 'UNAUTHORIZED', r.error, undefined, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON', 'Body inválido', undefined, 400); }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return apiError('TITLE_REQUIRED', 'El título es obligatorio', undefined, 400);

  const type = body.type as string;
  if (!VALID_TYPES.includes(type as any)) return apiError('INVALID_TYPE', 'Tipo inválido', undefined, 400);

  const priority = (body.priority as string) || 'MEDIUM';
  if (!VALID_PRIORITIES.includes(priority as any)) return apiError('INVALID_PRIORITY', 'Prioridad inválida', undefined, 400);

  const status = (body.status as string) || 'IDEA';
  if (!VALID_STATUSES.includes(status as any)) return apiError('INVALID_STATUS', 'Estado inválido', undefined, 400);

  const production = await prisma.production.create({
    data: {
      title,
      type: type as any,
      status: status as any,
      priority: priority as any,
      objective: typeof body.objective === 'string' ? body.objective : null,
      context: typeof body.context === 'string' ? body.context : null,
      message: typeof body.message === 'string' ? body.message : null,
      references: typeof body.references === 'string' ? body.references : null,
      targetAudience: typeof body.targetAudience === 'string' ? body.targetAudience : null,
      platform: typeof body.platform === 'string' ? body.platform : null,
      format: typeof body.format === 'string' ? body.format : null,
      duration: typeof body.duration === 'string' ? body.duration : null,
      deliverables: typeof body.deliverables === 'string' ? body.deliverables : null,
      deadline: body.deadline ? new Date(body.deadline as string) : null,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate as string) : null,
      requestedById: session!.userId,
      assignedToId: typeof body.assignedToId === 'string' ? body.assignedToId : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      tags: typeof body.tags === 'string' ? body.tags : null,
    },
  });

  return apiOk({ production }, 201);
}
