import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from "@/lib/auth-user";
import { checkRateLimitCustom } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { emitTaskUpdated } from '@/server/events';

function isValidDay(day: string | null): day is string {
  if (!day) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(day + "T00:00:00Z");
  return !isNaN(d.getTime());
}

type SaveItem = { taskId: string; done?: boolean; value?: number };
type SaveBody = {
  day?: string;
  items?: Array<SaveItem>;
};

export async function POST(req: NextRequest) {
  // Auth: require user_session
  const raw = getUserCookie(req as unknown as Request);
  const session = await verifyUserCookie(raw);
  if (!session) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
  }

  // Gentle rate limit: 10 req / 10s per user
  const rl = checkRateLimitCustom(`tasks_save:${session.userId}`, 10, 10_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSeconds) } });
  }

  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { "content-type": "application/json" } });
  }
  const day = body.day ?? null;
  const items = Array.isArray(body.items) ? body.items : [];
  if (!isValidDay(day)) {
    return new Response(JSON.stringify({ error: "invalid_day" }), { status: 400, headers: { "content-type": "application/json" } });
  }
  if (items.length > 100) {
    return new Response(JSON.stringify({ error: "invalid_items_length" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  // Resolve personId (Prisma)
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, personId: true } });
  if (!user || !user.personId) {
    return new Response(JSON.stringify({ error: "user_without_person" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  // Validate that tasks exist and are pending (not completed)
  const taskIds = Array.from(new Set(items.map(i => String(i.taskId)).filter(Boolean)));
  if (taskIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, saved: 0 }), { headers: { "content-type": "application/json" } });
  }
  // Schema Prisma garantiza columnas; filtrar activas y no completadas
  const hasCompleted = true;
  const hasActive = true;
  const hasMeasureEnabled = true;
  const hasTargetValue = true;
  const activeTasks = await prisma.task.findMany({ where: { id: { in: taskIds }, active: true, completed: false }, select: { id: true } });
  const activeSet = new Set(activeTasks.map(t => t.id));
  const validItems = items.filter(i => activeSet.has(String(i.taskId)));

  // Fetch previous statuses for change detection to avoid emitting noisy events
  const hasMeasureValue = true;
  const prevRows = taskIds.length > 0
    ? await prisma.personTaskStatus.findMany({ where: { personId: user.personId, day: day!, taskId: { in: taskIds } }, select: { taskId: true, done: true, measureValue: true } })
    : [];
  const prevDoneMap = new Map(prevRows.map(r => [String(r.taskId), !!r.done] as const));
  const prevValMap = new Map(prevRows.map(r => [String(r.taskId), Number(r.measureValue || 0)] as const));

  // Upsert each status via SQLite ON CONFLICT on (personId, taskId, day)
  let saved = 0;
  const changedEvents: Array<{ taskId: string; done: boolean; value?: number }> = [];
  // Preload task measurement metadata for derivation when needed
  let measureMeta = new Map<string, { enabled: boolean; target: number | null }>();
  if (hasMeasureEnabled) {
    const metaRows = await prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, measureEnabled: true, targetValue: true } });
    for (const r of metaRows) {
      const en = !!r.measureEnabled;
      const tv = r.targetValue;
      measureMeta.set(String(r.id), { enabled: en, target: (tv === null || tv === undefined) ? null : Number(tv) });
    }
  }

  for (const it of validItems) {
    const tid = String(it.taskId);
    const meta = measureMeta.get(tid) || { enabled: false, target: null };
    let doneFlag: boolean;
    let measureVal: number | null = null;
    if (meta.enabled && typeof it.value === 'number' && Number.isFinite(it.value)) {
      // Measurable: derive
      measureVal = Math.max(0, Math.floor(Number(it.value)));
      if (meta.target !== null && meta.target !== undefined) doneFlag = measureVal >= Number(meta.target);
      else doneFlag = measureVal > 0;
    } else {
      // Non measurable or no value provided: use boolean done (old contract)
      doneFlag = !!it.done;
      // Keep previous measure value if present; if not, treat as 0 (but do not override unless measurable)
      measureVal = hasMeasureValue ? prevValMap.get(tid) ?? 0 : null;
    }

    const doneVal = !!doneFlag;
    await prisma.personTaskStatus.upsert({
      where: { personId_taskId_day: { personId: user.personId, taskId: tid, day: day! } },
      create: { personId: user.personId, taskId: tid, day: day!, done: doneVal, measureValue: hasMeasureValue ? (measureVal ?? 0) : 0, updatedBy: session.userId },
      update: { done: doneVal, measureValue: hasMeasureValue ? (measureVal ?? 0) : 0, updatedBy: session.userId },
    });
    saved += 1;
    const prevDone = prevDoneMap.get(tid);
    const prevVal = prevValMap.get(tid);
    if (prevDone === undefined || prevDone !== doneFlag || (typeof measureVal === 'number' && measureVal !== prevVal)) {
      changedEvents.push({ taskId: tid, done: doneFlag, value: typeof measureVal === 'number' ? measureVal : undefined });
    }
  }

  // Basic audit trail: only when something was actually persisted
  if (saved > 0) {
    // Do not log item details; only minimal metadata
    await audit("TASKS_SAVE", session.userId, {
      personId: user.personId,
      day,
      count: saved,
    });

    // Notify listeners (admin dashboards) about changes per task
    for (const ch of changedEvents) {
      emitTaskUpdated({
        taskId: String(ch.taskId),
        completed: ch.done,
        value: typeof ch.value === 'number' ? ch.value : undefined,
        personId: String(user.personId),
        source: 'user',
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, saved }), { headers: { "content-type": "application/json" } });
}

export const dynamic = "force-dynamic";
