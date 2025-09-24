import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { randomBytes } from 'node:crypto';
import { isValidArea } from '@/lib/areas';

// Evitar prerender en build/export: depende de DB
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TaskRow = { id: string; label: string; completed?: number | boolean; sortOrder: number; priority?: number; startDay?: string | null; endDay?: string | null; area?: string | null; createdAt?: string; updatedAt?: string };

async function ensureTaskSchedulingColumns() {
  // Solo para SQLite de desarrollo; en Postgres las migraciones garantizan el esquema
  const url = process.env.DATABASE_URL || '';
  if (!url.startsWith('file:')) return;
  const info: Array<{ name: string }> = await prisma.$queryRaw`PRAGMA table_info("Task")` as any;
  const cols = new Set(info.map((c: any) => String(c.name)));
  if (!cols.has('priority')) await prisma.$executeRaw`ALTER TABLE "Task" ADD COLUMN priority INTEGER DEFAULT 0`;
  if (!cols.has('startDay')) await prisma.$executeRaw`ALTER TABLE "Task" ADD COLUMN startDay TEXT`;
  if (!cols.has('endDay')) await prisma.$executeRaw`ALTER TABLE "Task" ADD COLUMN endDay TEXT`;
  if (!cols.has('completed')) await prisma.$executeRaw`ALTER TABLE "Task" ADD COLUMN completed BOOLEAN DEFAULT 0`;
  if (!cols.has('measureEnabled')) await prisma.$executeRaw`ALTER TABLE "Task" ADD COLUMN measureEnabled BOOLEAN DEFAULT 0`;
  if (!cols.has('targetValue')) await prisma.$executeRaw`ALTER TABLE "Task" ADD COLUMN targetValue INTEGER`;
  if (!cols.has('unitLabel')) await prisma.$executeRaw`ALTER TABLE "Task" ADD COLUMN unitLabel TEXT`;
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

  // Leer tareas vía Prisma (compatible Postgres)
  const rows = await prisma.task.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { label: 'asc' },
    ],
  });

  // Aggregate PersonTaskStatus counts for the requested day
  let countsByTask = new Map<string, number>();
  let sumValuesByTask = new Map<string, number>();
  try {
    const doneAgg = await prisma.personTaskStatus.groupBy({
      by: ['taskId'],
      where: { day, done: true },
      _count: { _all: true },
    });
    countsByTask = new Map(doneAgg.map(r => [String(r.taskId), Number(r._count?._all || 0)]));
    const sumAgg = await prisma.personTaskStatus.groupBy({
      by: ['taskId'],
      where: { day },
      _sum: { measureValue: true },
    });
    sumValuesByTask = new Map(sumAgg.map(r => [String(r.taskId), Number(r._sum?.measureValue || 0)]));
  } catch {
    // si la tabla no existe en una DB antigua de dev, ignorar
  }

  const tasks = (rows || []).map((t: any) => ({
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
    const agg = await prisma.task.aggregate({ _max: { sortOrder: true } });
    const max = Number(agg._max.sortOrder || 0);
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

  const id = randomBytes(16).toString('hex');
  const created = await prisma.task.create({
    data: {
      id,
      label,
      completed: !!completed,
      sortOrder,
      priority,
      startDay: startDay || undefined,
      endDay: endDay || undefined,
      area: area || undefined,
      measureEnabled: !!measureEnabled,
      targetValue: targetValue ?? undefined,
      unitLabel: unitLabel || undefined,
    },
  });

  return NextResponse.json({ ok: true, task: {
    id: created.id,
    label: created.label,
    completed: !!created.completed,
    sortOrder: created.sortOrder,
    priority: created.priority,
    startDay: created.startDay ?? null,
    endDay: created.endDay ?? null,
    area: created.area ?? null,
    createdAt: created.createdAt as any,
    updatedAt: created.updatedAt as any,
    measureEnabled: !!created.measureEnabled,
    targetValue: created.targetValue ?? null,
    unitLabel: created.unitLabel ?? null,
  } });
}
