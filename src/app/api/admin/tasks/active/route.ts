export const runtime = 'nodejs';
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from "@/lib/auth";
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Require admin session (ADMIN role)
  const raw = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ["ADMIN"]);
  if (!r.ok) {
    return apiError(r.error || 'UNAUTHORIZED', r.error || 'UNAUTHORIZED', undefined, r.error === 'FORBIDDEN' ? 403 : 401);
  }

  // Postgres-safe: usamos Prisma; pending tasks = not completed
  const rows = await prisma.task.findMany({
    where: { completed: false },
    orderBy: [ { priority: 'desc' }, { sortOrder: 'asc' }, { label: 'asc' } ],
    select: { id: true, label: true, sortOrder: true, area: true },
  });
  const tasks = rows.map((t) => ({ id: String(t.id), label: String(t.label), sortOrder: Number(t.sortOrder), area: (t as any).area ?? null }));
  return apiOk({ ok: true, tasks });
}
