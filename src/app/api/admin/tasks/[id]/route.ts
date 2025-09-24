import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidArea } from '@/lib/areas';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { emitTaskUpdated } from '@/server/events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensureTaskSchedulingColumns() {
  // Solo para entornos SQLite de dev; Postgres usa migraciones
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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN']);
  if (!r.ok) {
    return NextResponse.json({ error: r.error || 'UNAUTHORIZED' }, { status: r.error === 'FORBIDDEN' ? 403 : 401 });
  }

  const id = String(params.id || '').trim();
  if (!id) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

  await ensureTaskSchedulingColumns();

  // Construir objeto de actualización para Prisma
  const data: any = {};
  if (typeof body.label === 'string') {
    const label = body.label.trim();
    if (!label || label.length > 200) return NextResponse.json({ error: 'INVALID_LABEL' }, { status: 400 });
    data.label = label;
  }
  if (body.completed !== undefined) {
    data.completed = !!body.completed;
  }
  if (body.priority !== undefined) {
    data.priority = Math.floor(Number(body.priority) || 0);
  }
  if (body.startDay !== undefined) {
    const v = typeof body.startDay === 'string' ? body.startDay.trim() : '';
    const re = /^\d{4}-\d{2}-\d{2}$/;
    data.startDay = v && re.test(v) ? v : null;
  }
  if (body.endDay !== undefined) {
    const v = typeof body.endDay === 'string' ? body.endDay.trim() : '';
    const re = /^\d{4}-\d{2}-\d{2}$/;
    data.endDay = v && re.test(v) ? v : null;
  }
  if (body.area !== undefined) {
    const v = typeof body.area === 'string' ? body.area.trim() : '';
    let area: string | null = null;
    if (v === '') area = null; else if (!isValidArea(v)) return NextResponse.json({ error: 'INVALID_AREA' }, { status: 400 });
    else area = v;
    data.area = area;
  }
  if (body.sortOrder !== undefined) {
    data.sortOrder = Math.max(0, Math.floor(Number(body.sortOrder)) || 0);
  }
  if (body.measureEnabled !== undefined) {
    if (typeof body.measureEnabled !== 'boolean') return NextResponse.json({ error: 'INVALID_MEASURE_ENABLED' }, { status: 400 });
    data.measureEnabled = !!body.measureEnabled;
  }
  if (body.targetValue !== undefined) {
    if (body.targetValue === null) data.targetValue = null;
    else {
      const n = Math.floor(Number(body.targetValue));
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: 'INVALID_TARGET_VALUE' }, { status: 400 });
      data.targetValue = n;
    }
  }
  if (body.unitLabel !== undefined) {
    if (body.unitLabel === null || body.unitLabel === undefined) data.unitLabel = null;
    else if (typeof body.unitLabel !== 'string') return NextResponse.json({ error: 'INVALID_UNIT_LABEL' }, { status: 400 });
    else {
      const s = body.unitLabel.trim();
      if (s.length === 0) data.unitLabel = null;
      else if (s.length > 30) return NextResponse.json({ error: 'UNIT_LABEL_TOO_LONG' }, { status: 400 });
      else data.unitLabel = s;
    }
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 });

  let updated;
  try {
    updated = await prisma.task.update({ where: { id }, data });
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  // Notify listeners in case completed status changed from admin side
  if (updated) {
    emitTaskUpdated({
      taskId: String(updated.id),
      completed: !!updated.completed,
      source: 'admin',
    });
  }
  return NextResponse.json({ ok: true, task: updated ? {
    id: String(updated.id),
    label: String(updated.label),
    completed: !!updated.completed,
    sortOrder: Number(updated.sortOrder || 0),
    priority: Number((updated as any).priority || 0),
    startDay: (updated as any).startDay ?? null,
    endDay: (updated as any).endDay ?? null,
    area: (updated as any).area ?? null,
    measureEnabled: !!(updated as any).measureEnabled,
    targetValue: (updated as any).targetValue ?? null,
    unitLabel: (updated as any).unitLabel ?? null,
    createdAt: (updated as any).createdAt,
    updatedAt: (updated as any).updatedAt,
  } : null });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN']);
  if (!r.ok) {
    return NextResponse.json({ error: r.error || 'UNAUTHORIZED' }, { status: r.error === 'FORBIDDEN' ? 403 : 401 });
  }
  const id = String(params.id || '').trim();
  if (!id) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });

  // Delete dependent rows first to respect FK constraints
  await prisma.personTaskStatus.deleteMany({ where: { taskId: id } });
  try {
    await prisma.task.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
