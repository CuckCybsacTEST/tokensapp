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

  // Resolve personId
  const userRows: Array<{ id: string; personId: string | null }> = await prisma.$queryRaw`SELECT id, personId FROM User WHERE id = ${session.userId} LIMIT 1`;
  const user = userRows[0];
  if (!user || !user.personId) {
    return new Response(JSON.stringify({ error: "user_without_person" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  // Validate that tasks exist and are pending (not completed)
  const taskIds = Array.from(new Set(items.map(i => String(i.taskId)).filter(Boolean)));
  if (taskIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, saved: 0 }), { headers: { "content-type": "application/json" } });
  }
  const placeholders = taskIds.map(() => "?").join(",");
  const info: Array<{ name: string }> = await prisma.$queryRawUnsafe(`PRAGMA table_info(Task)`);
  const cols = new Set(info.map((c: any) => String(c.name)));
  const hasCompleted = cols.has('completed');
  const hasActive = cols.has('active');
  const hasMeasureEnabled = cols.has('measureEnabled');
  const hasTargetValue = cols.has('targetValue');
  const activeTasks: Array<{ id: string }> = await prisma.$queryRawUnsafe(
    `SELECT id FROM Task WHERE ${hasActive ? 'active = 1 AND ' : ''}${hasCompleted ? '(completed IS NULL OR completed = 0)' : '1=1'} AND id IN (${placeholders})`,
    ...taskIds as any
  );
  const activeSet = new Set(activeTasks.map(t => t.id));
  const validItems = items.filter(i => activeSet.has(String(i.taskId)));

  // Fetch previous statuses for change detection to avoid emitting noisy events
  const ptsInfo: Array<{ name: string }> = await prisma.$queryRawUnsafe(`PRAGMA table_info(PersonTaskStatus)`);
  const ptsCols = new Set(ptsInfo.map((c: any) => String(c.name)));
  const hasMeasureValue = ptsCols.has('measureValue');
  const prevRows: Array<{ taskId: string; done: number; measureValue?: number | null }> = taskIds.length > 0
    ? await prisma.$queryRawUnsafe(
        `SELECT taskId, done${hasMeasureValue ? ', measureValue' : ''} FROM PersonTaskStatus WHERE personId = ? AND day = ? AND taskId IN (${placeholders})`,
        user.personId,
        day,
        ...taskIds as any
      )
    : [];
  const prevDoneMap = new Map(prevRows.map(r => [String(r.taskId), Number(r.done) === 1] as const));
  const prevValMap = new Map(prevRows.map(r => [String(r.taskId), Number((r as any).measureValue || 0)] as const));

  // Upsert each status via SQLite ON CONFLICT on (personId, taskId, day)
  let saved = 0;
  const nowIso = new Date().toISOString();
  const changedEvents: Array<{ taskId: string; done: boolean; value?: number }> = [];
  // Preload task measurement metadata for derivation when needed
  let measureMeta = new Map<string, { enabled: boolean; target: number | null }>();
  if (hasMeasureEnabled) {
    const metaRows: Array<{ id: string; measureEnabled?: number | boolean; targetValue?: number | null }> = await prisma.$queryRawUnsafe(
      `SELECT id, ${hasMeasureEnabled ? 'measureEnabled' : '0 as measureEnabled'}${hasTargetValue ? ', targetValue' : ', NULL as targetValue'} FROM Task WHERE id IN (${placeholders})`,
      ...taskIds as any
    );
    for (const r of metaRows) {
      const en = Number((r as any).measureEnabled) === 1 || (r as any).measureEnabled === true;
      const tv = (r as any).targetValue;
      measureMeta.set(String((r as any).id), { enabled: !!en, target: (tv === null || tv === undefined) ? null : Number(tv) });
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

    const doneVal = doneFlag ? 1 : 0;
    if (hasMeasureValue) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO PersonTaskStatus (id, personId, taskId, day, done, measureValue, updatedBy, updatedAt)
         VALUES (replace(hex(randomblob(16)),'',''), ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(personId, taskId, day) DO UPDATE SET done=excluded.done, measureValue=excluded.measureValue, updatedBy=excluded.updatedBy, updatedAt=excluded.updatedAt`,
        user.personId, tid, day, doneVal, (measureVal ?? 0), session.userId, nowIso
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO PersonTaskStatus (id, personId, taskId, day, done, updatedBy, updatedAt)
         VALUES (replace(hex(randomblob(16)),'',''), ?, ?, ?, ?, ?, ?)
         ON CONFLICT(personId, taskId, day) DO UPDATE SET done=excluded.done, updatedBy=excluded.updatedBy, updatedAt=excluded.updatedAt`,
        user.personId, tid, day, doneVal, session.userId, nowIso
      );
    }
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
