import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidArea } from '@/lib/areas';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { emitTaskUpdated } from '@/server/events';

async function ensureTaskSchedulingColumns() {
  const info: Array<{ name: string }> = await prisma.$queryRawUnsafe(`PRAGMA table_info(Task)`);
  const cols = new Set(info.map((c: any) => String(c.name)));
  if (!cols.has('priority')) await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN priority INTEGER DEFAULT 0`);
  if (!cols.has('startDay')) await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN startDay TEXT`);
  if (!cols.has('endDay')) await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN endDay TEXT`);
  if (!cols.has('completed')) await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN completed BOOLEAN DEFAULT 0`);
  // Measurement fields (dev-safety): add if missing
  if (!cols.has('measureEnabled')) await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN measureEnabled BOOLEAN DEFAULT 0`);
  if (!cols.has('targetValue')) await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN targetValue INTEGER`);
  if (!cols.has('unitLabel')) await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN unitLabel TEXT`);
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

  const updates: string[] = [];
  const values: any[] = [];
  if (typeof body.label === 'string') {
    const label = body.label.trim();
    if (!label || label.length > 200) return NextResponse.json({ error: 'INVALID_LABEL' }, { status: 400 });
    updates.push('label = ?');
    values.push(label);
  }
  // Deprecated: active (visibility) is no longer used in UI; rely on completed
  if (body.completed !== undefined) {
    const completed = body.completed ? 1 : 0;
    updates.push('completed = ?');
    values.push(completed);
  }
  if (body.priority !== undefined) {
    const priority = Math.floor(Number(body.priority) || 0);
    updates.push('priority = ?');
    values.push(priority);
  }
  if (body.startDay !== undefined) {
    const v = typeof body.startDay === 'string' ? body.startDay.trim() : '';
    const re = /^\d{4}-\d{2}-\d{2}$/;
    const start = v && re.test(v) ? v : null;
    updates.push('startDay = ?');
    values.push(start);
  }
  if (body.endDay !== undefined) {
    const v = typeof body.endDay === 'string' ? body.endDay.trim() : '';
    const re = /^\d{4}-\d{2}-\d{2}$/;
    const end = v && re.test(v) ? v : null;
    updates.push('endDay = ?');
    values.push(end);
  }
  if (body.area !== undefined) {
    const v = typeof body.area === 'string' ? body.area.trim() : '';
    let area: string | null = null;
    if (v === '') area = null; else if (!isValidArea(v)) return NextResponse.json({ error: 'INVALID_AREA' }, { status: 400 });
    else area = v;
    // No limit per area
    updates.push('area = ?');
    values.push(area);
  }
  if (body.sortOrder !== undefined) {
    const sort = Math.max(0, Math.floor(Number(body.sortOrder)) || 0);
    updates.push('sortOrder = ?');
    values.push(sort);
  }
  // Measurement fields
  if (body.measureEnabled !== undefined) {
    if (typeof body.measureEnabled !== 'boolean') return NextResponse.json({ error: 'INVALID_MEASURE_ENABLED' }, { status: 400 });
    updates.push('measureEnabled = ?');
    values.push(body.measureEnabled ? 1 : 0);
  }
  if (body.targetValue !== undefined) {
    let v: number | null = null;
    if (body.targetValue === null) v = null;
    else {
      const n = Math.floor(Number(body.targetValue));
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: 'INVALID_TARGET_VALUE' }, { status: 400 });
      v = n;
    }
    updates.push('targetValue = ?');
    values.push(v);
  }
  if (body.unitLabel !== undefined) {
    let v: string | null = null;
    if (body.unitLabel === null || body.unitLabel === undefined) v = null; else if (typeof body.unitLabel !== 'string') return NextResponse.json({ error: 'INVALID_UNIT_LABEL' }, { status: 400 });
    else {
      const s = body.unitLabel.trim();
      if (s.length === 0) v = null; else if (s.length > 30) return NextResponse.json({ error: 'UNIT_LABEL_TOO_LONG' }, { status: 400 });
      else v = s;
    }
    updates.push('unitLabel = ?');
    values.push(v);
  }
  if (updates.length === 0) return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 });

  updates.push('updatedAt = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const result: any = await prisma.$executeRawUnsafe(
    `UPDATE Task SET ${updates.join(', ')} WHERE id = ?`,
    ...values
  );
  const changed = Number(result) || 0;
  if (changed === 0) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const rows: any[] = await prisma.$queryRawUnsafe(`SELECT id, label, completed, sortOrder, priority, startDay, endDay, area, measureEnabled, targetValue, unitLabel, createdAt, updatedAt FROM Task WHERE id = ?`, id);
  const t = rows && rows[0];
  // Notify listeners in case completed status changed from admin side
  if (t) {
    emitTaskUpdated({
      taskId: String(t.id),
      completed: Number((t as any).completed) === 1 || (t as any).completed === true,
      source: 'admin',
    });
  }
  return NextResponse.json({ ok: true, task: t ? {
    id: String(t.id),
    label: String(t.label),
    completed: Number((t as any).completed) === 1 || (t as any).completed === true,
    sortOrder: Number(t.sortOrder || 0),
    priority: Number((t as any).priority || 0),
    startDay: (t as any).startDay ?? null,
    endDay: (t as any).endDay ?? null,
    area: t.area ?? null,
    measureEnabled: Number((t as any).measureEnabled) === 1 || (t as any).measureEnabled === true,
    targetValue: (t as any).targetValue ?? null,
    unitLabel: (t as any).unitLabel ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
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
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM PersonTaskStatus WHERE taskId = ?`, id);
  } catch (e) {
    // ignore; proceed to task deletion which will report NOT_FOUND if needed
  }
  const result: any = await prisma.$executeRawUnsafe(`DELETE FROM Task WHERE id = ?`, id);
  const deleted = Number(result) || 0;
  if (deleted === 0) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
