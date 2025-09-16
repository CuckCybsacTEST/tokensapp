import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { randomBytes } from 'node:crypto';
import { isValidArea } from '@/lib/areas';

type TaskRow = { id: string; label: string; completed?: number | boolean; sortOrder: number; priority?: number; startDay?: string | null; endDay?: string | null; area?: string | null; createdAt?: string; updatedAt?: string };

async function ensureTaskSchedulingColumns() {
  // Create columns if they do not exist (for dev DBs without migration applied)
  const info: Array<{ name: string }> = await prisma.$queryRawUnsafe(`PRAGMA table_info(Task)`);
  const cols = new Set(info.map((c: any) => String(c.name)));
  if (!cols.has('priority')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN priority INTEGER DEFAULT 0`);
  }
  if (!cols.has('startDay')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN startDay TEXT`);
  }
  if (!cols.has('endDay')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN endDay TEXT`);
  }
  if (!cols.has('completed')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN completed BOOLEAN DEFAULT 0`);
  }
  // Measurement support
  if (!cols.has('measureEnabled')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN measureEnabled BOOLEAN DEFAULT 0`);
  }
  if (!cols.has('targetValue')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN targetValue INTEGER`);
  }
  if (!cols.has('unitLabel')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN unitLabel TEXT`);
  }
}

export async function GET(req: Request) {
  // Require ADMIN session
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN']);
  if (!r.ok) {
    return NextResponse.json({ error: r.error || 'UNAUTHORIZED' }, { status: r.error === 'FORBIDDEN' ? 403 : 401 });
  }

  await ensureTaskSchedulingColumns();

  // Optional day filter to enrich with today's completion counts
  const url = new URL(req.url);
  const dayParam = url.searchParams.get('day');
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const todayLocal = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const day = (dayParam && re.test(dayParam)) ? dayParam : todayLocal();

  const rows: TaskRow[] = await prisma.$queryRawUnsafe(
    `SELECT id, label, completed, sortOrder, priority, startDay, endDay, area, createdAt, updatedAt, measureEnabled, targetValue, unitLabel FROM Task ORDER BY sortOrder ASC, label ASC`
  ) as any;

  // Aggregate PersonTaskStatus counts for the requested day
  let countsByTask = new Map<string, number>();
  let sumValuesByTask = new Map<string, number>();
  try {
    const agg: Array<{ taskId: string; cnt: number }> = await prisma.$queryRawUnsafe(
      `SELECT taskId as taskId, SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as cnt
       FROM PersonTaskStatus
       WHERE day = ?
       GROUP BY taskId`,
      day
    ) as any;
    countsByTask = new Map(agg.map(r => [String((r as any).taskId), Number((r as any).cnt || 0)]));
    // Sum of measure values for the requested day (measurable tasks)
    const aggSum: Array<{ taskId: string; sumv: number }> = await prisma.$queryRawUnsafe(
      `SELECT taskId as taskId, SUM(COALESCE(measureValue, 0)) as sumv
       FROM PersonTaskStatus
       WHERE day = ?
       GROUP BY taskId`,
      day
    ) as any;
    sumValuesByTask = new Map(aggSum.map(r => [String((r as any).taskId), Number((r as any).sumv || 0)]));
  } catch {
    // if table not present in a legacy DB, ignore silently
  }

  const tasks = (rows || []).map((t) => ({
    id: String((t as any).id),
    label: String((t as any).label),
    completed: Number((t as any).completed) === 1 || (t as any).completed === true,
    sortOrder: Number((t as any).sortOrder || 0),
    priority: Number((t as any).priority || 0),
    startDay: (t as any).startDay ?? null,
    endDay: (t as any).endDay ?? null,
    area: (t as any).area ?? null,
    createdAt: (t as any).createdAt,
    updatedAt: (t as any).updatedAt,
    measureEnabled: Number((t as any).measureEnabled) === 1 || (t as any).measureEnabled === true,
    targetValue: (t as any).targetValue !== null && (t as any).targetValue !== undefined ? Number((t as any).targetValue) : null,
    unitLabel: (t as any).unitLabel ?? null,
    completedToday: countsByTask.get(String((t as any).id)) || 0,
    sumValueToday: sumValuesByTask.get(String((t as any).id)) || 0,
  }));
  return NextResponse.json({ ok: true, tasks, day });
}

export async function POST(req: Request) {
  // Require ADMIN session
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN']);
  if (!r.ok) {
    return NextResponse.json({ error: r.error || 'UNAUTHORIZED' }, { status: r.error === 'FORBIDDEN' ? 403 : 401 });
  }

  await ensureTaskSchedulingColumns();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  if (!label || label.length > 200) {
    return NextResponse.json({ error: 'INVALID_LABEL' }, { status: 400 });
  }
  const completed = body?.completed ? 1 : 0;
  const measureEnabled = body?.measureEnabled ? 1 : 0;
  const targetValue = Number.isFinite(body?.targetValue) ? Math.max(0, Math.floor(Number(body.targetValue))) : null;
  const unitLabel = typeof body?.unitLabel === 'string' ? (body.unitLabel.trim().slice(0, 30) || null) : null;
  let area: string | null = null;
  if (body?.area !== undefined) {
    const v = typeof body.area === 'string' ? body.area.trim() : '';
    if (v === '') area = null; else if (!isValidArea(v)) {
      return NextResponse.json({ error: 'INVALID_AREA' }, { status: 400 });
    } else area = v;
  }
  // No limit per area
  let sortOrder: number;
  if (Number.isFinite(body?.sortOrder)) sortOrder = Math.max(0, Math.floor(Number(body.sortOrder)));
  else {
    // Default to max(sortOrder)+10 or 0
    const maxRows: any[] = await prisma.$queryRawUnsafe(`SELECT MAX(sortOrder) as maxSort FROM Task`);
    const max = Number(maxRows?.[0]?.maxSort || 0);
    sortOrder = (Number.isFinite(max) ? max : 0) + 10;
  }

  const priority: number = Number.isFinite(body?.priority) ? Math.floor(Number(body.priority)) : 0;
  // Validate simple YYYY-MM-DD format if provided; default startDay to 'today' if missing
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const fmtLocalYmd = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const startDay = typeof body?.startDay === 'string' && re.test(body.startDay) ? body.startDay : fmtLocalYmd();
  const endDay = typeof body?.endDay === 'string' && re.test(body.endDay) ? body.endDay : null;

  const nowIso = new Date().toISOString();
  const id = randomBytes(16).toString('hex');

  await prisma.$executeRawUnsafe(
    `INSERT INTO Task (id, label, completed, sortOrder, priority, startDay, endDay, area, createdAt, updatedAt, measureEnabled, targetValue, unitLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    label,
    completed,
    sortOrder,
    priority,
    startDay,
    endDay,
    area,
    nowIso,
    nowIso,
    measureEnabled,
    targetValue,
    unitLabel
  );

  const rows: TaskRow[] = await prisma.$queryRawUnsafe(
    `SELECT id, label, completed, sortOrder, priority, startDay, endDay, area, createdAt, updatedAt, measureEnabled, targetValue, unitLabel FROM Task WHERE id = ? LIMIT 1`,
    id
  ) as any;
  const t = rows && rows[0];
  if (!t) return NextResponse.json({ error: 'CREATED_NOT_FOUND' }, { status: 500 });

  return NextResponse.json({ ok: true, task: {
    id: String((t as any).id),
    label: String((t as any).label),
    completed: Number((t as any).completed) === 1 || (t as any).completed === true,
    sortOrder: Number((t as any).sortOrder || 0),
    priority: Number((t as any).priority || 0),
    startDay: (t as any).startDay ?? null,
    endDay: (t as any).endDay ?? null,
    area: (t as any).area ?? null,
    createdAt: (t as any).createdAt,
    updatedAt: (t as any).updatedAt,
    measureEnabled: Number((t as any).measureEnabled) === 1 || (t as any).measureEnabled === true,
    targetValue: (t as any).targetValue !== null && (t as any).targetValue !== undefined ? Number((t as any).targetValue) : null,
    unitLabel: (t as any).unitLabel ?? null,
  } });
}
