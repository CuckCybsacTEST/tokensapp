import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { newId } from '@/lib/id';

export const dynamic = 'force-dynamic';

function isValidDay(day: string | null): day is string { return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day); }

export async function GET(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const ok = requireRole(session, ['ADMIN', 'STAFF']);
  if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const day = url.searchParams.get('day');
  if (!isValidDay(day)) return NextResponse.json({ ok: false, code: 'INVALID_DAY' }, { status: 400 });
  const rows = await prisma.$queryRawUnsafe<any[]>(
    'SELECT "day","title","show","promos","notes","updatedAt" FROM "DayBrief" WHERE "day"=$1 LIMIT 1', day
  );
  return NextResponse.json({ ok: true, brief: rows && rows.length ? rows[0] : null });
}

export async function PUT(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const ok = requireRole(session, ['ADMIN', 'STAFF']);
  if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json().catch(() => null) as { day?: string; title?: string | null; show?: string | null; promos?: string | null; notes?: string | null } | null;
  const day = (body?.day || '').trim();
  if (!isValidDay(day)) return NextResponse.json({ ok: false, code: 'INVALID_DAY' }, { status: 400 });
  const title = (body?.title ?? '').toString().trim();
  const show = (body?.show ?? '').toString().trim();
  const promos = (body?.promos ?? '').toString().trim();
  const notes = (body?.notes ?? '').toString().trim();
  // Upsert via SQL: try update, if no rows then insert
  const updated = await prisma.$executeRawUnsafe(
    'UPDATE "DayBrief" SET "title"=$1,"show"=$2,"promos"=$3,"notes"=$4,"updatedAt"=CURRENT_TIMESTAMP WHERE "day"=$5',
    title || null,
    show || null,
    promos || null,
    notes || null,
    day
  );
  if (updated === 0) {
    const id = newId();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "DayBrief" ("id","day","title","show","promos","notes","createdBy","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
      id,
      day,
      title || null,
      show || null,
      promos || null,
      notes || null,
      null // createdBy (optional)
    );
  }
  return NextResponse.json({ ok: true });
}
