export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED'] as const;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(_req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError('UNAUTHORIZED', 'No autorizado', undefined, 401);

  const idea = await prisma.productionIdea.findUnique({
    where: { id: params.id },
    include: {
      submittedBy: { select: { id: true, username: true, person: { select: { name: true } } } },
      reactions: { select: { userId: true, type: true } },
      comments: {
        select: { id: true, content: true, createdAt: true, author: { select: { id: true, username: true, person: { select: { name: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
      production: { select: { id: true, title: true, status: true } },
    },
  });

  if (!idea) return apiError('NOT_FOUND', 'Idea no encontrada', undefined, 404);
  return apiOk({ idea });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR']);
  if (!r.ok) return apiError('FORBIDDEN', 'Solo coordinadores o admins pueden cambiar el estado', undefined, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON', 'Body inválido', undefined, 400); }

  const status = body.status as string;
  if (!VALID_STATUSES.includes(status as any)) return apiError('INVALID_STATUS', 'Estado inválido', undefined, 400);

  const idea = await prisma.productionIdea.update({
    where: { id: params.id },
    data: { status: status as any },
  });

  return apiOk({ idea });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN']);
  if (!r.ok) return apiError('FORBIDDEN', 'Solo admins pueden eliminar ideas', undefined, 403);

  await prisma.productionIdea.delete({ where: { id: params.id } });
  return apiOk({ deleted: true });
}
