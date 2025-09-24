import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from "@/lib/auth-user";

export const dynamic = 'force-dynamic';

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

  // Resolve personId for this user (Prisma)
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, personId: true } });
  if (!user || !user.personId) {
    return new Response(JSON.stringify({ error: "user_without_person" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  // Obtener área de la persona
  const person = await prisma.person.findUnique({ where: { id: user.personId }, select: { area: true } });
  const personArea: string | null = person?.area ?? null;

  // Prisma schema ya define todas las columnas; no usamos PRAGMA en Postgres
  const hasPriority = true;
  const hasStart = true;
  const hasEnd = true;
  const hasActive = true;
  const hasCompleted = true;
  const hasMeasureEnabled = true;
  const hasTargetValue = true;
  const hasUnitLabel = true;

  // Fetch tasks y statuses en paralelo, filtrando por ventana de fechas si existen columnas
  // Tareas: activas, globales o del área de la persona y dentro de la ventana (startDay/endDay)
  let sql = `SELECT id, label, sortOrder${hasPriority ? ', priority' : ''}${hasStart ? ', startDay' : ''}${hasEnd ? ', endDay' : ''}${hasCompleted ? ', completed' : ''}${hasMeasureEnabled ? ', measureEnabled' : ''}${hasTargetValue ? ', targetValue' : ''}${hasUnitLabel ? ', unitLabel' : ''} FROM Task WHERE ${hasActive ? 'active = 1 AND ' : ''}${hasCompleted ? '(completed IS NULL OR completed = 0)' : '1=1'} AND (area IS NULL OR area = ?)`;
  const params: any[] = [personArea];
  if (hasStart && hasEnd) {
    sql += ` AND (startDay IS NULL OR startDay <= ?) AND (endDay IS NULL OR endDay >= ?)`;
    params.push(day, day);
  }
  sql += ` ORDER BY ${hasPriority ? 'priority DESC, ' : ''} sortOrder ASC, label ASC`;

  // PersonTaskStatus tiene measureValue según schema
  const hasMeasureValue = true;

  const [tasksRaw, statusesRaw] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...(hasActive ? { active: true } : {}),
        ...(hasCompleted ? { completed: false } : {}),
        OR: [{ area: null }, { area: personArea ?? undefined }],
        ...(hasStart && hasEnd ? {
          AND: [
            { OR: [{ startDay: null }, { startDay: { lte: day! } }] },
            { OR: [{ endDay: null }, { endDay: { gte: day! } }] },
          ],
        } : {}),
      },
      select: { id: true, label: true, sortOrder: true, priority: true, startDay: true, endDay: true, completed: true, measureEnabled: true, targetValue: true, unitLabel: true },
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    }),
    prisma.personTaskStatus.findMany({
      where: { personId: user.personId, day: day! },
      select: { taskId: true, done: true, updatedAt: true, measureValue: true, user: { select: { username: true } } },
    }),
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
    done: !!s.done,
    value: hasMeasureValue ? Number(s.measureValue || 0) : 0,
    updatedAt: s.updatedAt,
    updatedByUsername: s.user?.username ?? null,
  }));

  return new Response(JSON.stringify({ tasks, statuses }), { headers: { "content-type": "application/json" } });
}
