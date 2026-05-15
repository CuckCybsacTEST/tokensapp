export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

const VALID_SOURCES = ['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'WEB', 'OTHER'] as const;

export async function GET(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError('UNAUTHORIZED', 'No autorizado', undefined, 401);

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const sourceType = url.searchParams.get('sourceType');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (sourceType) where.sourceType = sourceType;

  const ideas = await prisma.productionIdea.findMany({
    where,
    include: {
      submittedBy: { select: { id: true, username: true, person: { select: { name: true } } } },
      reactions: { select: { userId: true, type: true } },
      comments: {
        select: { id: true, content: true, createdAt: true, author: { select: { id: true, username: true, person: { select: { name: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
      production: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return apiOk({ ideas });
}

export async function POST(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR', 'STAFF']);
  if (!r.ok) return apiError('UNAUTHORIZED', 'No autorizado', undefined, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON', 'Body inválido', undefined, 400); }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return apiError('TITLE_REQUIRED', 'El título es obligatorio', undefined, 400);

  const sourceType = body.sourceType as string;
  if (!VALID_SOURCES.includes(sourceType as any)) return apiError('INVALID_SOURCE', 'Fuente inválida', undefined, 400);

  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : null;
  if (sourceUrl) {
    try { new URL(sourceUrl); } catch { return apiError('INVALID_URL', 'URL de fuente inválida', undefined, 400); }
  }

  const idea = await prisma.productionIdea.create({
    data: {
      title,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      sourceType: sourceType as any,
      sourceUrl: sourceUrl || null,
      submittedById: session!.userId,
    },
  });

  return apiOk({ idea }, 201);
}
