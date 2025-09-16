import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from "@/lib/auth-user";

function isValidDay(day: string | null): day is string {
  if (!day) return false;
  // YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(day + "T00:00:00Z");
  return !isNaN(d.getTime());
}

export async function GET(req: NextRequest) {
  // Auth: require user_session
  const raw = getUserCookie(req as unknown as Request);
  const session = await verifyUserCookie(raw);
  if (!session) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
  }

  const { searchParams } = new URL(req.url);
  const day = searchParams.get("day");
  if (!isValidDay(day)) {
    return new Response(JSON.stringify({ error: "invalid_day" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  // Resolve personId for this user
  const userRows: Array<{ id: string; personId: string | null }> = await prisma.$queryRaw`SELECT id, personId FROM User WHERE id = ${session.userId} LIMIT 1`;
  const user = userRows[0];
  if (!user || !user.personId) {
    return new Response(JSON.stringify({ error: "user_without_person" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  // Obtener área de la persona
  const personRows: Array<{ area: string | null }> = await prisma.$queryRaw`SELECT area FROM Person WHERE id = ${user.personId} LIMIT 1`;
  const personArea: string | null = (personRows?.[0]?.area as any) ?? null;

  // Ensure optional columns exist (dev safety)
  const info: Array<{ name: string }> = await prisma.$queryRawUnsafe(`PRAGMA table_info(Task)`);
  const cols = new Set(info.map((c: any) => String(c.name)));
  const hasPriority = cols.has('priority');
  const hasStart = cols.has('startDay');
  const hasEnd = cols.has('endDay');
  const hasActive = cols.has('active');
  const hasCompleted = cols.has('completed');
  const hasMeasureEnabled = cols.has('measureEnabled');
  const hasTargetValue = cols.has('targetValue');
  const hasUnitLabel = cols.has('unitLabel');

  // Fetch tasks y statuses en paralelo, filtrando por ventana de fechas si existen columnas
  // Tareas: activas, globales o del área de la persona y dentro de la ventana (startDay/endDay)
  let sql = `SELECT id, label, sortOrder${hasPriority ? ', priority' : ''}${hasStart ? ', startDay' : ''}${hasEnd ? ', endDay' : ''}${hasCompleted ? ', completed' : ''}${hasMeasureEnabled ? ', measureEnabled' : ''}${hasTargetValue ? ', targetValue' : ''}${hasUnitLabel ? ', unitLabel' : ''} FROM Task WHERE ${hasActive ? 'active = 1 AND ' : ''}${hasCompleted ? '(completed IS NULL OR completed = 0)' : '1=1'} AND (area IS NULL OR area = ?)`;
  const params: any[] = [personArea];
  if (hasStart && hasEnd) {
    sql += ` AND (startDay IS NULL OR startDay <= ?) AND (endDay IS NULL OR endDay >= ?)`;
    params.push(day, day);
  }
  sql += ` ORDER BY ${hasPriority ? 'priority DESC, ' : ''} sortOrder ASC, label ASC`;

  // Also check PersonTaskStatus columns for measurement value
  const infoPts: Array<{ name: string }> = await prisma.$queryRawUnsafe(`PRAGMA table_info(PersonTaskStatus)`);
  const colsPts = new Set((infoPts || []).map((c: any) => String(c.name)));
  const hasMeasureValue = colsPts.has('measureValue');

  const [tasksRaw, statusesRaw] = await Promise.all([
    prisma.$queryRawUnsafe(sql, ...params),
    prisma.$queryRawUnsafe(
      `SELECT pts.taskId as taskId, pts.done as done, pts.updatedAt as updatedAt, u.username as updatedByUsername${hasMeasureValue ? ', pts.measureValue as measureValue' : ''}
                     FROM PersonTaskStatus pts
                     LEFT JOIN User u ON u.id = pts.updatedBy
                     WHERE pts.personId = ? AND pts.day = ?`,
      user.personId,
      day
    ),
  ]);

  // Normalize booleans in case SQLite returns 0/1
  const tasks = (tasksRaw as any[]).map((t: any) => ({
    id: String(t.id),
    label: String(t.label),
    sortOrder: Number(t.sortOrder),
    priority: hasPriority ? Number(t.priority ?? 0) : 0,
    startDay: hasStart ? (t.startDay ?? null) : null,
    endDay: hasEnd ? (t.endDay ?? null) : null,
    measureEnabled: hasMeasureEnabled ? (t.measureEnabled === 1 || t.measureEnabled === true) : false,
    targetValue: hasTargetValue ? (t.targetValue !== null && t.targetValue !== undefined ? Number(t.targetValue) : null) : null,
    unitLabel: hasUnitLabel ? (t.unitLabel ?? null) : null,
  }));
  const statuses = (statusesRaw as any[]).map((s: any) => ({
    taskId: String(s.taskId),
    done: s.done === 1 || s.done === true,
    value: hasMeasureValue ? Number(s.measureValue || 0) : 0,
    updatedAt: s.updatedAt,
    updatedByUsername: s.updatedByUsername ?? null,
  }));

  return new Response(JSON.stringify({ tasks, statuses }), { headers: { "content-type": "application/json" } });
}
