import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from '@/lib/auth';
import { newId } from '@/lib/id';

export const dynamic = 'force-dynamic';

function isValidDay(day: string | null): day is string { return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day); }

const lastByUserTask: Map<string, number> = new Map();

// Asegura que la tabla exista en entornos donde no se hayan aplicado migraciones (dev)
let ensured = false;
async function ensureTaskCommentSchema() {
  if (ensured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TaskComment" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "taskId" TEXT NOT NULL,
        "day" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    // Indexes best-effort
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TaskComment_userId_idx" ON "TaskComment" ("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TaskComment_taskId_day_idx" ON "TaskComment" ("taskId","day");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TaskComment_day_idx" ON "TaskComment" ("day");`);
  } catch (e) {
    // Silenciar si falla por permisos en producción; de todas formas el INSERT fallará si no existe la tabla
  } finally {
    ensured = true;
  }
}

export async function POST(req: Request) {
  try {
    await ensureTaskCommentSchema();
    const raw = getUserCookie(req);
    const session = await verifyUserCookie(raw);
    if (!session) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => null) as { day?: string; taskId?: string; text?: string } | null;
    const day = (body?.day || '').trim();
    const taskId = (body?.taskId || '').trim();
    const text = (body?.text || '').toString().trim();
    if (!isValidDay(day)) return NextResponse.json({ ok: false, code: 'INVALID_DAY' }, { status: 400 });
    if (!taskId) return NextResponse.json({ ok: false, code: 'INVALID_TASK' }, { status: 400 });
    if (!text) return NextResponse.json({ ok: false, code: 'EMPTY' }, { status: 400 });

    // light rate limit per (userId+taskId)
    const key = `${session.userId}:${taskId}`;
    const now = Date.now();
    const last = lastByUserTask.get(key) || 0;
    if (now - last < 10_000) return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429 });
    lastByUserTask.set(key, now);

    const id = newId();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "TaskComment" ("id","userId","taskId","day","text","createdAt") VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)',
      id, session.userId, taskId, day, text
    );
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    // Log detallado en server para depuración local
    // eslint-disable-next-line no-console
    console.error('[tasks/comment] insert failed:', e);
    return NextResponse.json({ ok: false, code: 'ERROR', message: String(e?.message || e) }, { status: 500 });
  }
}
