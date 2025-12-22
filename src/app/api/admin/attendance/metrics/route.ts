export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie } from '@/lib/auth';
import { rangeBusinessDays } from '@/lib/date';
import type { Period } from '@/types/metrics';

export const dynamic = 'force-dynamic';

function ensureYmd(input?: string | null): string | null {
  if (!input) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  return input;
}

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    let authorized = false;
    if (session && requireRole(session, ['ADMIN', 'STAFF']).ok) authorized = true;
    if (!authorized) {
      const uRaw = getUserCookie(req);
      const uSession = await verifyUserSessionCookie(uRaw);
      if (uSession?.role === 'STAFF') authorized = true;
    }
    if (!authorized) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const url = new URL(req.url);
    const periodParam = (url.searchParams.get('period') || 'today').toLowerCase() as Period;
    const startDate = ensureYmd(url.searchParams.get('startDate')) || undefined;
    const endDate = ensureYmd(url.searchParams.get('endDate')) || undefined;

    const { startDay, endDay } = rangeBusinessDays(periodParam, startDate, endDate);

    // 1. Calculate Total Business Days in Period (days where at least one scan exists)
    // Filter out admins from business day calculation to avoid counting days where only admins were present
    const daysResult: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(DISTINCT s."businessDay") as count 
       FROM "Scan" s
       JOIN "Person" p ON p."id" = s."personId"
       WHERE s."businessDay" >= '${startDay}' AND s."businessDay" <= '${endDay}'
       AND p."name" NOT ILIKE '%Deivis Contreras%'
       AND p."name" NOT ILIKE '%Gabriela Mayhua%'
       AND p."name" NOT ILIKE '%Administrador%'`
    );
    const totalBusinessDays = Number(daysResult[0]?.count || 0);

    // 2. Aggregate Shifts per Person
    const shifts: any[] = await prisma.$queryRawUnsafe(
      `WITH scans AS (
        SELECT s."personId", s."businessDay" as day,
          MIN(CASE WHEN s."type"='IN' THEN s."scannedAt" END) as "firstIn",
          MAX(CASE WHEN s."type"='OUT' THEN s."scannedAt" END) as "lastOut"
        FROM "Scan" s
        WHERE s."businessDay" >= '${startDay}' AND s."businessDay" <= '${endDay}'
        GROUP BY s."personId", s."businessDay"
      )
      SELECT 
        sc."personId",
        p."code" as "personCode",
        p."name" as "personName",
        sc.day,
        sc."firstIn",
        sc."lastOut",
        CASE WHEN sc."firstIn" IS NOT NULL AND sc."lastOut" IS NOT NULL AND sc."lastOut" > sc."firstIn"
             THEN EXTRACT(EPOCH FROM (sc."lastOut" - sc."firstIn")) / 60.0 END as "durationMin"
      FROM scans sc
      JOIN "Person" p ON p."id" = sc."personId"
      WHERE p.active = true
      AND p."name" NOT ILIKE '%Deivis Contreras%'
      AND p."name" NOT ILIKE '%Gabriela Mayhua%'
      AND p."name" NOT ILIKE '%Administrador%'`
    );

    // 3. Calculate Summary Metrics
    let totalShifts = 0;
    let completeShifts = 0;
    let incompleteShifts = 0;
    let sumDuration = 0;
    let countDuration = 0;
    const uniquePeople = new Set<string>();

    // For Rankings
    const personStats = new Map<string, { 
      code: string, 
      name: string, 
      daysAttended: number, 
      incompleteCount: number, 
      completeCount: number,
      totalDuration: number 
    }>();

    for (const s of shifts) {
      totalShifts++;
      uniquePeople.add(s.personId);
      
      const isComplete = !!s.firstIn && !!s.lastOut;
      // "Incomplete" in the context of "Missing Exit" specifically means they have an IN but no OUT.
      // If they have no IN (only OUT), it's an anomaly but not a "Missing Exit".
      const isMissingExit = !!s.firstIn && !s.lastOut;

      if (isComplete) {
        completeShifts++;
        if (s.durationMin) {
          sumDuration += Number(s.durationMin);
          countDuration++;
        }
      } else {
        // Only count as incomplete shift for the summary if it's a missing exit? 
        // Or should summary track all non-complete? 
        // Let's keep summary as "non-complete" but rankings as "missing exit".
        // Actually, to be consistent with the UI label "Faltas de Salida", we should probably only count missing exits.
        if (isMissingExit) {
          incompleteShifts++;
        }
      }

      // Update Person Stats
      if (!personStats.has(s.personId)) {
        personStats.set(s.personId, { 
          code: s.personCode, 
          name: s.personName, 
          daysAttended: 0, 
          incompleteCount: 0, 
          completeCount: 0,
          totalDuration: 0 
        });
      }
      const stats = personStats.get(s.personId)!;
      stats.daysAttended++;
      
      // Only increment incompleteCount if it's specifically a missing exit
      if (isMissingExit) stats.incompleteCount++;
      if (isComplete) stats.completeCount++;
      
      if (s.durationMin) stats.totalDuration += Number(s.durationMin);
    }

    const completionRate = totalShifts > 0 ? (completeShifts / totalShifts) * 100 : 0;
    const avgDurationMin = countDuration > 0 ? sumDuration / countDuration : 0;

    // 4. Generate Rankings
    const allStats = Array.from(personStats.values());

    // Top Absences: (Total Business Days - Days Attended) DESC
    const allActivePeople: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, code, name FROM "Person"
       WHERE active = true
       AND name NOT ILIKE '%Deivis Contreras%'
       AND name NOT ILIKE '%Gabriela Mayhua%'
       AND name NOT ILIKE '%Administrador%'`
    );

    const absenceRanking = allActivePeople.map(p => {
      const stats = personStats.get(p.id);
      const daysAttended = stats?.daysAttended || 0;
      const daysMissed = Math.max(0, totalBusinessDays - daysAttended);
      return {
        personCode: p.code,
        personName: p.name,
        daysAttended,
        daysMissed
      };
    }).sort((a, b) => b.daysMissed - a.daysMissed).slice(0, 10);

    // Top Incomplete (Most "Falta Salida")
    const incompleteRanking = allStats
      .filter(s => s.incompleteCount > 0)
      .sort((a, b) => b.incompleteCount - a.incompleteCount)
      .slice(0, 10)
      .map(s => ({
        personCode: s.code,
        personName: s.name,
        incompleteCount: s.incompleteCount
      }));

    // Top Complete (Most "Marcado Salida")
    const completeRanking = allStats
      .sort((a, b) => b.completeCount - a.completeCount)
      .slice(0, 10)
      .map(s => ({
        personCode: s.code,
        personName: s.name,
        completeCount: s.completeCount
      }));

    // Top Duration (Most Hours Worked)
    const durationRanking = allStats
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 10)
      .map(s => ({
        personCode: s.code,
        personName: s.name,
        totalDurationMin: s.totalDuration,
        avgDurationMin: s.daysAttended ? s.totalDuration / s.daysAttended : 0
      }));

    return NextResponse.json({
      ok: true,
      summary: {
        totalShifts,
        completeShifts,
        incompleteShifts,
        completionRate,
        avgDurationMin,
        totalUniquePeople: uniquePeople.size,
        totalBusinessDays
      },
      topAbsences: absenceRanking,
      topIncomplete: incompleteRanking,
      topComplete: completeRanking,
      topDuration: durationRanking
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: e.message }, { status: 500 });
  }
}
