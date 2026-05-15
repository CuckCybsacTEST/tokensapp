export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

const VALID_REACTIONS = ['FIRE', 'LIKE', 'MEH'] as const;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError('UNAUTHORIZED', 'No autorizado', undefined, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON', 'Body inválido', undefined, 400); }

  const type = body.type as string;
  if (!VALID_REACTIONS.includes(type as any)) return apiError('INVALID_REACTION', 'Reacción inválida', undefined, 400);

  const idea = await prisma.productionIdea.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!idea) return apiError('NOT_FOUND', 'Idea no encontrada', undefined, 404);

  // Si ya reaccionó con el mismo tipo → eliminar (toggle). Si es distinto → actualizar.
  const existing = await prisma.ideaReaction.findUnique({
    where: { ideaId_userId: { ideaId: params.id, userId: session!.userId } },
  });

  if (existing) {
    if (existing.type === type) {
      await prisma.ideaReaction.delete({ where: { id: existing.id } });
      return apiOk({ removed: true });
    }
    const updated = await prisma.ideaReaction.update({
      where: { id: existing.id },
      data: { type: type as any },
    });
    return apiOk({ reaction: updated });
  }

  const reaction = await prisma.ideaReaction.create({
    data: { ideaId: params.id, userId: session!.userId, type: type as any },
  });
  return apiOk({ reaction });
}
