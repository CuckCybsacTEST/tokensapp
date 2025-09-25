import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function isValidDay(day: string | null): day is string {
  return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const day = url.searchParams.get('day');
  if (!isValidDay(day)) return NextResponse.json({ ok: false, code: 'INVALID_DAY' }, { status: 400 });
  const rows = await prisma.$queryRawUnsafe<any[]>(
    'SELECT "day","title","show","promos","notes","updatedAt" FROM "DayBrief" WHERE "day"=$1 LIMIT 1',
    day
  );
  const row = rows && rows.length ? rows[0] : null;
  return NextResponse.json({ ok: true, brief: row || null });
}
