export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { isValidArea } from '@/lib/areas';
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  // Require ADMIN session
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN']);
  if (!r.ok) {
    return apiError(r.error || 'UNAUTHORIZED', r.error || 'UNAUTHORIZED', undefined, r.error === 'FORBIDDEN' ? 403 : 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON','JSON inválido',undefined,400); }
  const idsRaw: any[] = Array.isArray(body?.ids) ? body.ids : [];
  const ids = idsRaw.map((v) => String(v || '').trim()).filter(Boolean);
  if (ids.length === 0) return apiError('EMPTY_IDS','Lista de ids vacía',undefined,400);
  // Validate area: '' or null => null, or one of ALLOWED
  let area: string | null = null;
  if (body?.area !== undefined) {
    const v = (typeof body.area === 'string' ? body.area : '').trim();
  if (v === '') area = null; else if (!isValidArea(v)) return apiError('INVALID_AREA','Área inválida',undefined,400);
    else area = v;
  }

  // Fetch tasks to ensure all ids exist and belong to the declared area
  const tasks = await prisma.task.findMany({ where: { id: { in: ids } }, select: { id: true, area: true } });
  if (tasks.length !== ids.length) return apiError('SOME_IDS_NOT_FOUND','Algunos ids no existen',undefined,400);
  for (const t of tasks) {
    const ta = (t as any).area ?? null;
    const taNorm = ta === null ? null : String(ta);
    if (taNorm !== (area ?? null)) {
      return apiError('AREA_MISMATCH','Área inconsistente',undefined,400);
    }
  }

  // Assign new sortOrder in steps of 10 to leave gaps for future inserts
  const base = 10;
  const tx: any[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const order = (i + 1) * base;
    tx.push(prisma.task.update({ where: { id }, data: { sortOrder: order } }));
  }
  await prisma.$transaction(tx);
  return apiOk({ ok: true });
}
