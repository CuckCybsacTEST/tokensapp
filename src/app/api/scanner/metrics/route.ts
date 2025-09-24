export const dynamic = 'force-dynamic';
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
    const total = await prisma.scan.count({ where: { scannedAt: { gte: since } } });

    // Unique persons scanned since 'since' (distinct personId)
    const distinctPersons = await prisma.scan.findMany({
      where: { scannedAt: { gte: since } },
      distinct: ['personId'],
      select: { personId: true },
    });
    const uniquePersons = distinctPersons.length;

    // Duplicates blocked: count EventLog SCAN_DUPLICATE events since 'since'
    const duplicatesBlocked = await prisma.eventLog.count({
      where: { type: 'SCAN_DUPLICATE', createdAt: { gte: since } },
    });

    // Breakdown IN/OUT
    const grouped = await prisma.scan.groupBy({
      by: ['type'],
      where: { scannedAt: { gte: since } },
      _count: { _all: true },
    });
    let inCount = 0;
    let outCount = 0;
    for (const g of grouped) {
      const t = String(g.type || '').toUpperCase();
      const c = Number(g._count?._all || 0);
      if (t === 'IN') inCount = c; else if (t === 'OUT') outCount = c;
    }

    // Checklist saves (TASKS_SAVE) since 'since' — requires audit implemented in /api/tasks/save
    const checklistSaves = await prisma.eventLog.count({
      where: { type: 'TASKS_SAVE', createdAt: { gte: since } },
    });

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
