import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') || 'today').toLowerCase();
    const person = (searchParams.get('person') || '').trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200);

    const since = range === 'week' ? startOfWeek() : startOfToday();
    const sinceIso = since.toISOString();

    const esc = (s: string) => s.replace(/'/g, "''");
    const wherePerson = person ? `AND (p.code = '${esc(person)}' OR p.code LIKE '%${esc(person)}%')` : '';

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT s.id, s.scannedAt, s.type, s.deviceId, p.id as personId, p.name as personName, p.code as personCode, p.jobTitle as personJobTitle
       FROM Scan s
       JOIN Person p ON p.id = s.personId
       WHERE s.scannedAt >= '${sinceIso}'
       ${wherePerson}
       ORDER BY s.scannedAt DESC
       LIMIT ${limit}`
    );

    return NextResponse.json({ ok: true, range: range === 'week' ? 'week' : 'today', since: sinceIso, scans: rows });
  } catch (e: any) {
    console.error('recent scans endpoint error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
