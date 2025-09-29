export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isValidDay(day: string | null): day is string { return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day); }

export async function GET(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const ok = requireRole(session, ['ADMIN','STAFF']);
  if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });
  const url = new URL(req.url);
  const day = url.searchParams.get('day');
  const taskId = (url.searchParams.get('taskId') || '').trim();
  if (!isValidDay(day)) return NextResponse.json({ ok: false, code: 'INVALID_DAY' }, { status: 400 });
  if (!taskId) return NextResponse.json({ ok: false, code: 'INVALID_TASK' }, { status: 400 });
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT c."id", c."text", c."createdAt", u."username", p."code" as "personCode", p."name" as "personName"
     FROM "TaskComment" c
     JOIN "User" u ON u."id" = c."userId"
     JOIN "Person" p ON p."id" = u."personId"
     WHERE c."taskId" = $1 AND c."day" = $2
     ORDER BY c."createdAt" DESC
    `,
    taskId, day
  );
  return NextResponse.json({ ok: true, comments: rows || [] });
}
