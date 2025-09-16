import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from "@/lib/auth";

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

  const info: Array<{ name: string }> = await prisma.$queryRawUnsafe(`PRAGMA table_info(Task)`);
  const hasPriority = new Set(info.map((c: any) => String(c.name))).has('priority');
  // Pending tasks = not administratively completed
  const infoCols = new Set(info.map((c: any) => String(c.name)));
  const hasCompleted = infoCols.has('completed');
  const hasActive = infoCols.has('active');
  const sql = `SELECT id, label, sortOrder, area ${hasPriority ? ', priority' : ''} ${hasCompleted ? ', completed' : ''} FROM Task WHERE ${hasActive ? 'active = 1 AND ' : ''}${hasCompleted ? '(completed IS NULL OR completed = 0)' : '1=1'} ORDER BY ${hasPriority ? 'priority DESC, ' : ''} sortOrder ASC, label ASC`;
  const rows: any[] = await prisma.$queryRawUnsafe(sql);
  const tasks = (rows as any[]).map((t) => ({ id: String(t.id), label: String(t.label), sortOrder: Number(t.sortOrder), area: (t as any).area ?? null }));
  return new Response(JSON.stringify({ ok: true, tasks }), { headers: { "content-type": "application/json" } });
}
