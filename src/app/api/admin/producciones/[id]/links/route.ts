export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

const VALID_LINK_TYPES = ['REFERENCE', 'DELIVERABLE', 'PUBLISHED'] as const;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError(r.error || 'UNAUTHORIZED', r.error, undefined, 401);

  const production = await prisma.production.findUnique({ where: { id: params.id } });
  if (!production) return apiError('NOT_FOUND', 'Producción no encontrada', undefined, 404);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON', 'Body inválido', undefined, 400); }

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!label || !url) return apiError('FIELDS_REQUIRED', 'Label y URL son obligatorios', undefined, 400);

  // Basic URL format validation
  try { new URL(url); } catch { return apiError('INVALID_URL', 'La URL no tiene un formato válido', undefined, 400); }

  const type = typeof body.type === 'string' && VALID_LINK_TYPES.includes(body.type as any) ? body.type as any : 'DELIVERABLE';

  const link = await prisma.productionLink.create({
    data: { productionId: params.id, label, url, type },
  });

  return apiOk({ link }, 201);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError(r.error || 'UNAUTHORIZED', r.error, undefined, 401);

  const url = new URL(req.url);
  const linkId = url.searchParams.get('linkId');
  if (!linkId) return apiError('LINK_ID_REQUIRED', 'linkId es obligatorio', undefined, 400);

  const link = await prisma.productionLink.findFirst({ where: { id: linkId, productionId: params.id } });
  if (!link) return apiError('NOT_FOUND', 'Link no encontrado', undefined, 404);

  await prisma.productionLink.delete({ where: { id: linkId } });
  return apiOk({ deleted: true });
}
