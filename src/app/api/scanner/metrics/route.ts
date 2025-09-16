import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function startOfWeek(): Date {
  // Week starts Monday; compute 00:00 of last Monday
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // 0 for Monday, 6 for Sunday
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') || 'today').toLowerCase();
    let since: Date;
    if (range === 'week') since = startOfWeek();
    else since = startOfToday();

    const sinceIso = since.toISOString();

    // Total scans since 'since'
    const totalRows: Array<{ count: number } & Record<string, any>> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM Scan WHERE scannedAt >= '${sinceIso}'`
    );
    const total = Number(totalRows?.[0]?.count || 0);

    // Unique persons scanned since 'since'
    const uniqueRows: Array<{ count: number } & Record<string, any>> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(DISTINCT personId) as count FROM Scan WHERE scannedAt >= '${sinceIso}'`
    );
    const uniquePersons = Number(uniqueRows?.[0]?.count || 0);

    // Duplicates blocked: count EventLog SCAN_DUPLICATE events since 'since'
    const dupRows: Array<{ count: number } & Record<string, any>> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM EventLog WHERE type='SCAN_DUPLICATE' AND createdAt >= '${sinceIso}'`
    );
    const duplicatesBlocked = Number(dupRows?.[0]?.count || 0);

    // Breakdown IN/OUT
    const breakdownRows: Array<{ type: string; count: number } & Record<string, any>> = await prisma.$queryRawUnsafe(
      `SELECT type, COUNT(*) as count FROM Scan WHERE scannedAt >= '${sinceIso}' GROUP BY type`
    );
    let inCount = 0;
    let outCount = 0;
    for (const r of breakdownRows || []) {
      if ((r.type || '').toUpperCase() === 'IN') inCount = Number(r.count || 0);
      else if ((r.type || '').toUpperCase() === 'OUT') outCount = Number(r.count || 0);
    }

    // Checklist saves (TASKS_SAVE) since 'since' — requires audit implemented in /api/tasks/save
    const tasksSaveRows: Array<{ count: number } & Record<string, any>> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM EventLog WHERE type='TASKS_SAVE' AND createdAt >= '${sinceIso}'`
    );
    const checklistSaves = Number(tasksSaveRows?.[0]?.count || 0);

    return NextResponse.json({
      ok: true,
      range: range === 'week' ? 'week' : 'today',
      since: sinceIso,
      metrics: {
        total,
        uniquePersons,
        duplicatesBlocked,
        breakdown: { IN: inCount, OUT: outCount },
        checklistSaves,
      },
    });
  } catch (e: any) {
    console.error('metrics endpoint error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
