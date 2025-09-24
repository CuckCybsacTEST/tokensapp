import { prisma } from '@/lib/prisma';
import { rangeBusinessDays, ymdUtc, addDays } from '@/lib/date';
import type { Period, MetricsResponse, AttendanceMetrics, TaskMetrics, SeriesByDay } from '@/types/metrics';

export type GetMetricsParams = {
  period: Period;
  startDate?: string; // YYYY-MM-DD (UTC)
  endDate?: string;   // YYYY-MM-DD (UTC)
  area?: string | null;
  person?: string | null; // Optional filter. If it matches a Person.code or an exact Person.id (prefix id:), will filter
};

function esc(s: any): string { return String(s).replace(/'/g, "''"); }

function buildPersonWhere(area?: string | null, person?: string | null) {
  const conds: string[] = [];
  if (area) conds.push(`p."area" = '${esc(area)}'`);
  if (person) {
    if (person.startsWith('id:')) {
      conds.push(`p."id" = '${esc(person.slice(3))}'`);
    } else {
      // treat as code exact match
      conds.push(`p."code" = '${esc(person)}'`);
    }
  }
  return conds.length ? 'WHERE ' + conds.join(' AND ') : '';
}

export async function getAttendanceMetrics(params: GetMetricsParams): Promise<MetricsResponse> {
  const { period, startDate, endDate, area, person } = params;
  // Usamos rango de business days (por ahora equivalente a rango calendario UTC)
  const range = rangeBusinessDays(period, startDate, endDate);
  const { startIso, endIso, startDay, endDay } = range;

  // Where clause helpers
  const personWhere = buildPersonWhere(area ?? undefined, person ?? undefined);
  const joinPerson = personWhere ? 'JOIN "Person" p ON p."id" = s."personId"' : '';
  const joinPersonPTS = personWhere ? 'JOIN "Person" p ON p."id" = pts."personId"' : '';

  // Attendance metrics (fewer queries)
  // totals IN/OUT and uniquePersons (IN) together
  const totalsRows: any[] = await prisma.$queryRawUnsafe(
   `SELECT 
      SUM(CASE WHEN s."type" = 'IN' THEN 1 ELSE 0 END) as inCount,
      SUM(CASE WHEN s."type" = 'OUT' THEN 1 ELSE 0 END) as outCount,
      COUNT(DISTINCT CASE WHEN s."type"='IN' THEN s."personId" END) as uniqIn
    FROM "Scan" s ${joinPerson}
    ${personWhere ? personWhere : ''}
    ${personWhere ? 'AND' : 'WHERE'} s."scannedAt" >= '${startIso}' AND s."scannedAt" < '${endIso}'`
  );
  const uniquePersons = Number(totalsRows?.[0]?.uniqIn || 0);
  const totalsIN = Number(totalsRows?.[0]?.inCount || 0);
  const totalsOUT = Number(totalsRows?.[0]?.outCount || 0);

  // completedDaysPct and avgDurationMin combined via daily CTE
  const dailyRows: any[] = await prisma.$queryRawUnsafe(
    `WITH daily AS (
       SELECT s."personId", s."businessDay" as day,
              MIN(CASE WHEN s."type"='IN' THEN s."scannedAt" END) as firstIn,
              MAX(CASE WHEN s."type"='OUT' THEN s."scannedAt" END) as lastOut
       FROM "Scan" s ${joinPerson}
       ${personWhere ? personWhere : ''}
       ${personWhere ? 'AND' : 'WHERE'} s."scannedAt" >= '${startIso}' AND s."scannedAt" < '${endIso}'
       GROUP BY s."personId", s."businessDay"
     )
     SELECT 
       AVG(CASE WHEN firstIn IS NOT NULL AND lastOut IS NOT NULL AND lastOut > firstIn
                THEN EXTRACT(EPOCH FROM (lastOut - firstIn)) / 60.0 END) as avgMin,
       SUM(CASE WHEN firstIn IS NOT NULL THEN 1 ELSE 0 END) as totalWithIn,
       SUM(CASE WHEN firstIn IS NOT NULL AND lastOut IS NOT NULL THEN 1 ELSE 0 END) as totalWithBoth
     FROM daily`
  );
  const totalWithIn = Number(dailyRows?.[0]?.totalWithIn || 0);
  const totalWithBoth = Number(dailyRows?.[0]?.totalWithBoth || 0);
  const completedDaysPct = totalWithIn > 0 ? (100 * totalWithBoth) / totalWithIn : 0;
  const avgDurationMin = dailyRows?.[0]?.avgMin != null ? Number(dailyRows[0].avgMin) : null;

  // heatmapByHour (UTC)
  const heatRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT EXTRACT(HOUR FROM s."scannedAt" AT TIME ZONE 'UTC')::int as hour,
            SUM(CASE WHEN s."type"='IN' THEN 1 ELSE 0 END) as inCount,
            SUM(CASE WHEN s."type"='OUT' THEN 1 ELSE 0 END) as outCount
     FROM "Scan" s ${joinPerson}
     ${personWhere ? personWhere : ''}
     ${personWhere ? 'AND' : 'WHERE'} s."scannedAt" >= '${startIso}' AND s."scannedAt" < '${endIso}'
     GROUP BY EXTRACT(HOUR FROM s."scannedAt" AT TIME ZONE 'UTC')::int
     ORDER BY hour ASC`
  );
  const heatmapByHour: Array<{ hour: number; in: number; out: number }> = Array.from({ length: 24 }, (_, h) => {
    const row = heatRows?.find((r: any) => Number(r.hour) === h);
    return { hour: h, in: row ? Number(row.inCount || 0) : 0, out: row ? Number(row.outCount || 0) : 0 };
  });

  // byArea (present=distinct persons with IN; completedPct per area)
  const byAreaRows: any[] = await prisma.$queryRawUnsafe(
    `WITH days AS (
  SELECT s."personId", s."businessDay" as day,
    SUM(CASE WHEN s."type"='IN' THEN 1 ELSE 0 END) as hasIn,
    SUM(CASE WHEN s."type"='OUT' THEN 1 ELSE 0 END) as hasOut
  FROM "Scan" s JOIN "Person" p ON p."id" = s."personId"
  ${area || person ? buildPersonWhere(area ?? undefined, person ?? undefined) : ''}
  ${area || person ? 'AND' : 'WHERE'} s."scannedAt" >= '${startIso}' AND s."scannedAt" < '${endIso}'
  GROUP BY s."personId", s."businessDay"
     )
     SELECT p."area" as area,
       COUNT(DISTINCT CASE WHEN days.hasIn > 0 THEN days."personId" END) as present,
       SUM(CASE WHEN days.hasIn > 0 THEN 1 ELSE 0 END) as withIn,
       SUM(CASE WHEN days.hasIn > 0 AND days.hasOut > 0 THEN 1 ELSE 0 END) as withBoth
     FROM days JOIN "Person" p ON p."id" = days."personId"
     GROUP BY p."area"`
  );
  const byArea = (byAreaRows || []).map((r: any) => {
    const withIn = Number(r.withIn || 0);
    const withBoth = Number(r.withBoth || 0);
    return { area: r.area ?? null, present: Number(r.present || 0), completedPct: withIn > 0 ? (100 * withBoth) / withIn : 0 };
  });

  // Tasks metrics (combine completion rate and fully completed)
  const ptsWhere = `${joinPersonPTS} ${personWhere ? personWhere : ''}`;
  const tasksAggRows: any[] = await prisma.$queryRawUnsafe(
    `WITH per_day AS (
       SELECT pts."personId", pts."day",
              SUM(CASE WHEN pts."done" THEN 1 ELSE 0 END) as doneCount,
              COUNT(1) as totalCount
       FROM "PersonTaskStatus" pts ${ptsWhere}
       ${personWhere ? 'AND' : 'WHERE'} pts."day" >= '${esc(startDay)}' AND pts."day" <= '${esc(endDay)}'
       GROUP BY pts."personId", pts."day"
     )
     SELECT 
       SUM(doneCount) as doneCount,
       SUM(totalCount) as totalCount,
       SUM(CASE WHEN totalCount > 0 THEN 1 ELSE 0 END) as journeys,
       SUM(CASE WHEN totalCount > 0 AND doneCount = totalCount THEN 1 ELSE 0 END) as full
     FROM per_day`
  );
  const doneCount = Number(tasksAggRows?.[0]?.doneCount || 0);
  const totalCount = Number(tasksAggRows?.[0]?.totalCount || 0);
  const journeys = Number(tasksAggRows?.[0]?.journeys || 0);
  const full = Number(tasksAggRows?.[0]?.full || 0);
  const completionRatePct = totalCount > 0 ? (100 * doneCount) / totalCount : 0;
  const fullyCompletedPct = journeys > 0 ? (100 * full) / journeys : 0;

  // topIncompleteTasks: top 5 donde done = 0
  const topRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT pts."taskId" as taskId, COALESCE(t."label", pts."taskId") as label,
            SUM(CASE WHEN pts."done" = false THEN 1 ELSE 0 END) as missingCount
     FROM "PersonTaskStatus" pts ${joinPersonPTS}
     LEFT JOIN "Task" t ON t."id" = pts."taskId"
     ${personWhere ? personWhere : ''}
     ${personWhere ? 'AND' : 'WHERE'} pts."day" >= '${esc(startDay)}' AND pts."day" <= '${esc(endDay)}'
     GROUP BY pts."taskId", t."label"
     ORDER BY missingCount DESC
     LIMIT 5`
  );
  const topIncompleteTasks = (topRows || []).map((r: any) => ({ taskId: String(r.taskId), label: String(r.label), missingCount: Number(r.missingCount || 0) }));

  // Time to first/last task (mins)
  const timeRows: any[] = await prisma.$queryRawUnsafe(
    `WITH first_in AS (
       SELECT s."personId", s."businessDay" as day, MIN(s."scannedAt") as firstIn
       FROM "Scan" s JOIN "Person" p ON p."id" = s."personId"
       ${area || person ? buildPersonWhere(area ?? undefined, person ?? undefined) : ''}
       ${area || person ? 'AND' : 'WHERE'} s."type"='IN' AND s."scannedAt" >= '${startIso}' AND s."scannedAt" < '${endIso}'
       GROUP BY s."personId", s."businessDay"
     ), done_tasks AS (
       SELECT pts."personId", pts."day",
              MIN(CASE WHEN pts."done" THEN pts."updatedAt" END) as firstDone,
              MAX(CASE WHEN pts."done" THEN pts."updatedAt" END) as lastDone
       FROM "PersonTaskStatus" pts JOIN "Person" p ON p."id" = pts."personId"
       ${area || person ? buildPersonWhere(area ?? undefined, person ?? undefined) : ''}
       ${area || person ? 'AND' : 'WHERE'} pts."day" >= '${esc(startDay)}' AND pts."day" <= '${esc(endDay)}'
       GROUP BY pts."personId", pts."day"
     )
     SELECT 
       AVG(EXTRACT(EPOCH FROM (dt.firstDone - fi.firstIn)) / 60.0) as toFirstMin,
       AVG(EXTRACT(EPOCH FROM (dt.lastDone - fi.firstIn)) / 60.0) as toLastMin
     FROM first_in fi JOIN done_tasks dt ON fi."personId" = dt."personId" AND fi.day = dt.day
     WHERE dt.firstDone IS NOT NULL`
  );
  const timeToFirstTaskMin = timeRows?.[0]?.toFirstMin != null ? Number(timeRows[0].toFirstMin) : null;
  const timeToLastTaskMin = timeRows?.[0]?.toLastMin != null ? Number(timeRows[0].toLastMin) : null;

  // Series byDay (single query combines IO, uniq, avg duration, completion per day)
  const seriesRows: any[] = await prisma.$queryRawUnsafe(
    `WITH io AS (
       SELECT s."businessDay" as day,
              SUM(CASE WHEN s."type"='IN' THEN 1 ELSE 0 END) as inCount,
              SUM(CASE WHEN s."type"='OUT' THEN 1 ELSE 0 END) as outCount,
              COUNT(DISTINCT CASE WHEN s."type"='IN' THEN s."personId" END) as uniq
       FROM "Scan" s ${joinPerson}
       ${personWhere ? personWhere : ''}
       ${personWhere ? 'AND' : 'WHERE'} s."scannedAt" >= '${startIso}' AND s."scannedAt" < '${endIso}'
       GROUP BY s."businessDay"
     ), daily AS (
       SELECT s."personId", s."businessDay" as day,
              MIN(CASE WHEN s."type"='IN' THEN s."scannedAt" END) as firstIn,
              MAX(CASE WHEN s."type"='OUT' THEN s."scannedAt" END) as lastOut
       FROM "Scan" s ${joinPerson}
       ${personWhere ? personWhere : ''}
       ${personWhere ? 'AND' : 'WHERE'} s."scannedAt" >= '${startIso}' AND s."scannedAt" < '${endIso}'
       GROUP BY s."personId", s."businessDay"
     ), davg AS (
       SELECT day, AVG(CASE WHEN firstIn IS NOT NULL AND lastOut IS NOT NULL AND lastOut > firstIn
                            THEN EXTRACT(EPOCH FROM (lastOut - firstIn)) / 60.0 END) as avgMin
       FROM daily
       GROUP BY day
     ), tpd AS (
       SELECT pts."day" as day,
              SUM(CASE WHEN pts."done" THEN 1 ELSE 0 END) as doneCount,
              COUNT(1) as totalCount
       FROM "PersonTaskStatus" pts ${joinPersonPTS}
       ${personWhere ? personWhere : ''}
       ${personWhere ? 'AND' : 'WHERE'} pts."day" >= '${esc(startDay)}' AND pts."day" <= '${esc(endDay)}'
       GROUP BY pts."day"
     ), days AS (
       SELECT day FROM io
       UNION
       SELECT day FROM davg
       UNION
       SELECT day FROM tpd
     )
     SELECT d.day as day,
            coalesce(io.inCount,0) as inCount,
            coalesce(io.outCount,0) as outCount,
            coalesce(io.uniq,0) as uniq,
            davg.avgMin as avgMin,
            tpd.doneCount as doneCount,
            tpd.totalCount as totalCount
     FROM days d
     LEFT JOIN io ON io.day = d.day
     LEFT JOIN davg ON davg.day = d.day
     LEFT JOIN tpd ON tpd.day = d.day
     ORDER BY d.day ASC`
  );

  // Generamos la lista completa de businessDays dentro del rango (equiv. actual a días calendario).
  const businessDays: string[] = [];
  {
    const start = new Date(startIso);
    const end = new Date(endIso);
    for (let d = start; d < end; d = addDays(d, 1)) {
      businessDays.push(ymdUtc(d));
    }
  }
  const byDay: SeriesByDay[] = businessDays.map((bday) => {
    const r = seriesRows?.find((x: any) => String(x.day) === bday);
    const done = Number(r?.doneCount || 0);
    const tot = Number(r?.totalCount || 0);
    return {
      day: bday,
      in: Number(r?.inCount || 0),
      out: Number(r?.outCount || 0),
      uniquePersons: Number(r?.uniq || 0),
      avgDurationMin: r?.avgMin != null ? Number(r.avgMin) : null,
      completionRatePct: tot > 0 ? (100 * done) / tot : 0,
    };
  });

  const attendance: AttendanceMetrics = {
    uniquePersons,
    totals: { IN: totalsIN, OUT: totalsOUT },
    completedDaysPct,
    avgDurationMin,
    heatmapByHour,
    byArea,
  };

  const tasks: TaskMetrics = {
    completionRatePct,
    fullyCompletedPct,
    topIncompleteTasks,
    timeToFirstTaskMin,
    timeToLastTaskMin,
  };

  return {
    period: { name: range.name, startDate: range.startDay, endDate: range.endDay },
    attendance,
    tasks,
    series: { byDay },
  };
}
