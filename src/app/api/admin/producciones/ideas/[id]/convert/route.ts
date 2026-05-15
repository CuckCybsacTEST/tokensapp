export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

// Convierte una idea aprobada en una Producción real
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR']);
  if (!r.ok) return apiError('FORBIDDEN', 'Solo coordinadores o admins pueden convertir ideas', undefined, 403);

  const idea = await prisma.productionIdea.findUnique({ where: { id: params.id } });
  if (!idea) return apiError('NOT_FOUND', 'Idea no encontrada', undefined, 404);
  if (idea.status === 'CONVERTED') return apiError('ALREADY_CONVERTED', 'Esta idea ya fue convertida', undefined, 400);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* body optional */ }

  const productionType = (body.type as string) || 'OTHER';

  // Crear la Producción pre-rellenada con datos de la idea
  const production = await prisma.production.create({
    data: {
      title: idea.title,
      type: productionType as any,
      status: 'BRIEFED',
      priority: 'MEDIUM',
      objective: idea.description || null,
      references: idea.sourceUrl || null,
      requestedById: idea.submittedById,
    },
  });

  // Vincular y marcar como convertida
  await prisma.productionIdea.update({
    where: { id: params.id },
    data: { status: 'CONVERTED', productionId: production.id },
  });

  return apiOk({ production });
}
