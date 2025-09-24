import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Require admin session (ADMIN role)
  const raw = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ["ADMIN"]);
  if (!r.ok) {
    return new Response(JSON.stringify({ error: r.error || "UNAUTHORIZED" }), {
      status: r.error === "FORBIDDEN" ? 403 : 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Postgres-safe: usamos Prisma; pending tasks = not completed
  const rows = await prisma.task.findMany({
    where: { completed: false },
    orderBy: [ { priority: 'desc' }, { sortOrder: 'asc' }, { label: 'asc' } ],
    select: { id: true, label: true, sortOrder: true, area: true },
  });
  const tasks = rows.map((t) => ({ id: String(t.id), label: String(t.label), sortOrder: Number(t.sortOrder), area: (t as any).area ?? null }));
  return new Response(JSON.stringify({ ok: true, tasks }), { headers: { "content-type": "application/json" } });
}
