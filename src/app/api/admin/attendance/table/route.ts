import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { rangeBusinessDays } from '@/lib/date';
import { prisma as _p } from '@/lib/prisma';
import type { Period } from '@/types/metrics';

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
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const roleCheck = requireRole(session, ['ADMIN', 'STAFF']);
    if (!roleCheck.ok) {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }

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

    const area = url.searchParams.get('area') || undefined;
    const person = url.searchParams.get('person') || undefined;
    const esc = (s: any) => String(s).replace(/'/g, "''");
    const personWhereConds: string[] = [];
    if (area) personWhereConds.push(`p."area" = '${esc(area)}'`);
    if (person) {
      if (person.startsWith('id:')) {
        personWhereConds.push(`p."id" = '${esc(person.slice(3))}'`);
      } else {
        personWhereConds.push(`p."code" = '${esc(person)}'`);
      }
    }
    const personWhereCond = personWhereConds.join(' AND ');

    // Aggregate per person/day rows
    const rows: any[] = await prisma.$queryRawUnsafe(
      `WITH scans AS (
    SELECT s."personId", s."businessDay" as day,
      MIN(CASE WHEN s."type"='IN' THEN s."scannedAt" END) as firstIn,
      MAX(CASE WHEN s."type"='OUT' THEN s."scannedAt" END) as lastOut
    FROM "Scan" s
    LEFT JOIN "Person" p ON p."id" = s."personId"
    WHERE s."businessDay" >= '${startDay}' AND s."businessDay" <= '${endDay}'
    ${personWhereCond ? `AND ${personWhereCond}` : ''}
    GROUP BY s."personId", s."businessDay"
  ), tasks AS (
    SELECT pts."personId", pts."day",
      SUM(CASE WHEN pts."done" THEN 1 ELSE 0 END) as doneCount,
      COUNT(1) as totalCount
    FROM "PersonTaskStatus" pts
    LEFT JOIN "Person" p ON p."id" = pts."personId"
    WHERE pts."day" >= '${startDay}' AND pts."day" <= '${endDay}'
    ${personWhereCond ? `AND ${personWhereCond}` : ''}
    GROUP BY pts."personId", pts."day"
  ), days AS (
         SELECT "personId", day FROM scans
         UNION
         SELECT "personId", day FROM tasks
       ), merged AS (
         SELECT p."code" as "personCode", p."name" as "personName", p."area" as "area",
                d.day as "day",
                sc.firstIn as "firstIn",
                sc.lastOut as "lastOut",
                CASE WHEN sc.firstIn IS NOT NULL AND sc.lastOut IS NOT NULL AND sc.lastOut > sc.firstIn
                     THEN EXTRACT(EPOCH FROM (sc.lastOut - sc.firstIn)) / 60.0 END as "durationMin",
                coalesce(tk.doneCount, 0) as "doneCount",
                coalesce(tk.totalCount, 0) as "totalCount"
         FROM days d
         JOIN "Person" p ON p."id" = d."personId"
         LEFT JOIN scans sc ON sc."personId" = d."personId" AND sc.day = d.day
         LEFT JOIN tasks tk ON tk."personId" = d."personId" AND tk.day = d.day
         ${personWhereCond ? `WHERE ${personWhereCond}` : ''}
       )
       SELECT * FROM merged
     ORDER BY day DESC, "personName" ASC
       LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`
    );

    let countRows: any[];
    try {
      countRows = await prisma.$queryRawUnsafe(
        `WITH scans AS (
           SELECT s."personId", s."businessDay" as day
           FROM "Scan" s LEFT JOIN "Person" p ON p."id" = s."personId"
           WHERE s."businessDay" >= '${startDay}' AND s."businessDay" <= '${endDay}'
           ${personWhereCond ? `AND ${personWhereCond}` : ''}
           GROUP BY s."personId", s."businessDay"
         ), tasks AS (
           SELECT pts."personId", pts."day"
           FROM "PersonTaskStatus" pts LEFT JOIN "Person" p ON p."id" = pts."personId"
           WHERE pts."day" >= '${startDay}' AND pts."day" <= '${endDay}'
           ${personWhereCond ? `AND ${personWhereCond}` : ''}
           GROUP BY pts."personId", pts."day"
         ), merged AS (
           SELECT coalesce(sc.day, tk.day) as day, coalesce(sc."personId", tk."personId") as "personId"
           FROM scans sc
           FULL OUTER JOIN tasks tk ON tk."personId" = sc."personId" AND tk.day = sc.day
         )
         SELECT COUNT(1) as total FROM merged`
      );
    } catch {
      // SQLite fallback (no FULL OUTER JOIN): use UNION
      countRows = await prisma.$queryRawUnsafe(
        `WITH scans AS (
           SELECT s."personId", s."businessDay" as day
           FROM "Scan" s LEFT JOIN "Person" p ON p."id" = s."personId"
           WHERE s."businessDay" >= '${startDay}' AND s."businessDay" <= '${endDay}'
           ${personWhereCond ? `AND ${personWhereCond}` : ''}
           GROUP BY s."personId", s."businessDay"
         ), tasks AS (
           SELECT pts."personId", pts."day"
           FROM "PersonTaskStatus" pts LEFT JOIN "Person" p ON p."id" = pts."personId"
           WHERE pts."day" >= '${startDay}' AND pts."day" <= '${endDay}'
           ${personWhereCond ? `AND ${personWhereCond}` : ''}
           GROUP BY pts."personId", pts."day"
         ), merged AS (
           SELECT "personId", day FROM scans
           UNION
           SELECT "personId", day FROM tasks
         )
         SELECT COUNT(1) as total FROM merged`
      );
    }

    const total = Number(countRows?.[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const mapped = (rows || []).map(r => {
      const done = Number(r.doneCount || 0);
      const tot = Number(r.totalCount || 0);
      const completionPct = tot > 0 ? (100 * done) / tot : 0;
      const status = (r.firstIn && r.lastOut) ? (completionPct >= 100 ? 'Completa' : 'Con faltantes') : (tot > 0 && completionPct >= 100 ? 'Completa' : 'Con faltantes');
      return {
        day: String(r.day),
        personCode: String(r.personCode),
        personName: String(r.personName),
        area: r.area ? String(r.area) : null,
        firstIn: r.firstIn ? (r.firstIn instanceof Date ? r.firstIn.toISOString() : String(r.firstIn)) : null,
        lastOut: r.lastOut ? (r.lastOut instanceof Date ? r.lastOut.toISOString() : String(r.lastOut)) : null,
        durationMin: r.durationMin != null ? Number(r.durationMin) : null,
        doneCount: done,
        totalCount: tot,
        completionPct,
        status,
      };
    });

    return NextResponse.json({ ok: true, rows: mapped, page, pageSize, total, totalPages }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: msg }, { status: 500 });
  }
}
