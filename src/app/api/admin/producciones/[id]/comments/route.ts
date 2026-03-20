export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError(r.error || 'UNAUTHORIZED', r.error, undefined, 401);

  const production = await prisma.production.findUnique({ where: { id: params.id } });
  if (!production) return apiError('NOT_FOUND', 'Producción no encontrada', undefined, 404);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON', 'Body inválido', undefined, 400); }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return apiError('CONTENT_REQUIRED', 'El comentario no puede estar vacío', undefined, 400);

  const comment = await prisma.productionComment.create({
    data: {
      productionId: params.id,
      authorId: session!.userId,
      content,
    },
    include: { author: { select: { id: true, username: true, person: { select: { name: true } } } } },
  });

  return apiOk({ comment }, 201);
}
