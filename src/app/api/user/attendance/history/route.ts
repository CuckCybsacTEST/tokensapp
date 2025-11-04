export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import { rangeBusinessDays } from '@/lib/date';
import type { Period } from '@/types/metrics';
import { currentBusinessDay } from '@/lib/attendanceDay';

export const dynamic = 'force-dynamic';

function badRequest(message: string, code: string = 'BAD_REQUEST') {
  return NextResponse.json({ ok: false, code, message }, { status: 400 });
}

function ensureYmd(input?: string | null): string | null {
  if (!input) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  return input;
}

export async function GET(req: Request) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const url = new URL(req.url);
    const periodParam = (url.searchParams.get('period') || 'today').toLowerCase() as Period;
    const allowed: Period[] = ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'custom'];
    if (!allowed.includes(periodParam)) return badRequest(`Invalid period: ${periodParam}`);
    const startDate = ensureYmd(url.searchParams.get('startDate')) || undefined;
    const endDate = ensureYmd(url.searchParams.get('endDate')) || undefined;
    if (periodParam === 'custom') {
      if (!startDate || !endDate) return badRequest('custom period requires startDate and endDate in YYYY-MM-DD');
      if (startDate > endDate) return badRequest('startDate must be <= endDate');
    }

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20));

    const { startIso, endIso, startDay, endDay } = rangeBusinessDays(periodParam, startDate, endDate);

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { person: { select: { name: true, area: true } } }
    });
    if (!user) return badRequest('User not found');

    // Get attendance records for this user only
    const scans = await prisma.scan.findMany({
      where: {
        personId: user.personId,
        businessDay: { gte: startDay, lte: endDay },
        type: { in: ['IN', 'OUT'] }
      },
      orderBy: [
        { businessDay: 'desc' },
        { scannedAt: 'asc' }
      ]
    });

    // Group by business day
    const dayGroups = new Map<string, typeof scans>();
    for (const scan of scans) {
      const day = scan.businessDay;
      if (!dayGroups.has(day)) dayGroups.set(day, []);
      dayGroups.get(day)!.push(scan);
    }

    // Build table rows
    const rows: any[] = [];
    for (const [day, dayScans] of dayGroups) {
      const sortedScans = dayScans.sort((a, b) => a.scannedAt.getTime() - b.scannedAt.getTime());

      const firstIn = sortedScans.find(s => s.type === 'IN');
      const lastOut = sortedScans.filter(s => s.type === 'OUT').pop();

      let durationMin: number | null = null;
      if (firstIn && lastOut) {
        durationMin = Math.round((lastOut.scannedAt.getTime() - firstIn.scannedAt.getTime()) / (1000 * 60));
      }

      const inCount = sortedScans.filter(s => s.type === 'IN').length;
      const outCount = sortedScans.filter(s => s.type === 'OUT').length;
      const doneCount = Math.min(inCount, outCount);
      const totalCount = Math.max(inCount, outCount);
      const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

      let status = 'Completado';
      if (completionPct < 100) status = 'Incompleto';
      if (completionPct === 0) status = 'Sin registros';

      rows.push({
        day,
        personCode: user.person?.name || 'N/A',
        personName: user.person?.name || 'Usuario',
        area: user.person?.area || null,
        firstIn: firstIn?.scannedAt.toISOString() || null,
        lastOut: lastOut?.scannedAt.toISOString() || null,
        durationMin,
        doneCount,
        totalCount,
        completionPct,
        status,
        incomplete: completionPct < 100
      });
    }

    // Sort by day descending
    rows.sort((a, b) => b.day.localeCompare(a.day));

    // Pagination
    const total = rows.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRows = rows.slice(startIndex, endIndex);

    return NextResponse.json({
      ok: true,
      rows: paginatedRows,
      page,
      pageSize,
      total,
      totalPages
    });

  } catch (e: any) {
    console.error('User attendance history error:', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR', message: 'Internal server error' }, { status: 500 });
  }
}