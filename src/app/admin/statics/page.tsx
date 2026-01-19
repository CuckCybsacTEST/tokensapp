import React from "react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { currentBusinessDay } from "@/lib/attendanceDay";

export const dynamic = "force-dynamic";

function formatMinutes(min: number | null | undefined) {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

async function getAttendanceMetrics(startDate: Date | undefined, endDate: Date | undefined) {
  let startDay: string;
  let endDay: string;

  if (startDate && endDate) {
    startDay = startDate.toISOString().split('T')[0];
    endDay = endDate.toISOString().split('T')[0];
  } else {
    startDay = currentBusinessDay();
    endDay = startDay;
  }

  // 1. Calculate Total Business Days
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

  // 2. Aggregate Shifts
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

  // 3. Calculate Summary
  let totalShifts = 0;
  let completeShifts = 0;
  let incompleteShifts = 0;
  let sumDuration = 0;
  let countDuration = 0;
  const uniquePeople = new Set<string>();
  
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
    const isMissingExit = !!s.firstIn && !s.lastOut;

    if (isComplete) {
      completeShifts++;
      if (s.durationMin) {
        sumDuration += Number(s.durationMin);
        countDuration++;
      }
    } else {
      if (isMissingExit) {
        incompleteShifts++;
      }
    }

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
    
    if (isMissingExit) stats.incompleteCount++;
    if (isComplete) stats.completeCount++;
    if (s.durationMin) stats.totalDuration += Number(s.durationMin);
  }

  const completionRate = totalShifts > 0 ? (completeShifts / totalShifts) * 100 : 0;
  const avgDurationMin = countDuration > 0 ? sumDuration / countDuration : 0;

  // 4. Rankings
  const allStats = Array.from(personStats.values());

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

  const incompleteRanking = allStats
    .filter(s => s.incompleteCount > 0)
    .sort((a, b) => b.incompleteCount - a.incompleteCount)
    .slice(0, 10)
    .map(s => ({
      personCode: s.code,
      personName: s.name,
      incompleteCount: s.incompleteCount
    }));

  const completeRanking = allStats
    .sort((a, b) => b.completeCount - a.completeCount)
    .slice(0, 10)
    .map(s => ({
      personCode: s.code,
      personName: s.name,
      completeCount: s.completeCount
    }));

  const durationRanking = allStats
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .slice(0, 10)
    .map(s => ({
      personCode: s.code,
      personName: s.name,
      totalDurationMin: s.totalDuration,
      avgDurationMin: s.daysAttended ? s.totalDuration / s.daysAttended : 0
    }));

  return {
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
  };
}

function getDateRange(startDateStr: string | null, endDateStr: string | null) {
  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    // Ajustar end para que incluya todo el día (23:59:59.999)
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  return { start: undefined, end: undefined };
}

async function getBirthdayMetrics(startDate: Date | undefined, endDate: Date | undefined) {
  const dateFilter = startDate ? {
    date: {
      gte: startDate,
      lte: endDate || new Date()
    }
  } : {};

  // Total de reservas celebradas en el periodo (independientemente del estado actual, pero que no estén canceladas antes de la fecha?)
  // Mejor contar todas las que cayeron en la fecha y desglosar por estado.
  const totalReservations = await prisma.birthdayReservation.count({
    where: { ...dateFilter }
  });

  const completedReservations = await prisma.birthdayReservation.count({
    where: { status: 'completed', ...dateFilter }
  });

  const canceledReservations = await prisma.birthdayReservation.count({
    where: { status: 'canceled', ...dateFilter }
  });

  // Reservas efectivas: Host llegó
  const effectiveReservations = await prisma.birthdayReservation.count({
    where: { hostArrivedAt: { not: null }, ...dateFilter }
  });

  // Invitados
  const guestsData = await prisma.birthdayReservation.aggregate({
    where: { ...dateFilter },
    _sum: {
      guestsPlanned: true,
      guestArrivals: true
    }
  });

  const totalGuestsPlanned = guestsData._sum.guestsPlanned || 0;
  const totalGuestsArrived = guestsData._sum.guestArrivals || 0;

  // Tasas
  const effectiveRate = totalReservations > 0 ? ((effectiveReservations / totalReservations) * 100).toFixed(1) : "0.0";
  const guestAttendanceRate = totalGuestsPlanned > 0 ? ((totalGuestsArrived / totalGuestsPlanned) * 100).toFixed(1) : "0.0";
  const noShowRate = totalReservations > 0 ? (((totalReservations - effectiveReservations - canceledReservations) / totalReservations) * 100).toFixed(1) : "0.0"; // Aprox, asumiendo que no effective y no canceled es no-show (o pendiente)

  return {
    totalReservations,
    completedReservations,
    canceledReservations,
    effectiveReservations,
    totalGuestsPlanned,
    totalGuestsArrived,
    effectiveRate,
    guestAttendanceRate,
    noShowRate
  };
}

async function getMetrics(startDate: Date | undefined, endDate: Date | undefined) {
  // Filtramos por fecha de expiración del TOKEN, no creación del batch
  const dateFilter = startDate ? { expiresAt: { gte: startDate, lte: endDate } } : {};

  // Filtros para batches de ruleta: no reusables y sin staticTargetUrl
  const batchFilter = { isReusable: false, staticTargetUrl: null };

  // Tokens totales que expiran en el período
  const totalTokens = await prisma.token.count({
    where: { 
      batch: batchFilter,
      ...dateFilter
    },
  });

  // Tokens revelados (de batches que expiran en el período)
  const revealedTokens = await prisma.token.count({
    where: { 
      revealedAt: { not: null }, 
      batch: batchFilter,
      ...dateFilter 
    },
  });

  // Tokens no revelados
  const unrevealedTokens = await prisma.token.count({
    where: { 
      revealedAt: null, 
      batch: batchFilter,
      ...dateFilter 
    },
  });

  // Tokens entregados
  const deliveredTokens = await prisma.token.count({
    where: { 
      deliveredAt: { not: null }, 
      batch: batchFilter,
      ...dateFilter 
    },
  });

  // Tasa de entrega
  const deliveryRate = totalTokens > 0 ? ((deliveredTokens / totalTokens) * 100).toFixed(2) : "0.00";

  // Tasa de escaneo
  const scanRate = totalTokens > 0 ? ((revealedTokens / totalTokens) * 100).toFixed(2) : "0.00";

  // Tiempo promedio de entrega (Lead Time: Revealed -> Delivered)
  const deliveredTokensWithDates = await prisma.token.findMany({
    where: {
      deliveredAt: { not: null },
      revealedAt: { not: null },
      batch: batchFilter,
      ...dateFilter
    },
    select: { revealedAt: true, deliveredAt: true }
  });

  let totalLeadTimeMs = 0;
  let leadTimeCount = 0;
  for (const t of deliveredTokensWithDates) {
    if (t.revealedAt && t.deliveredAt) {
      const diff = t.deliveredAt.getTime() - t.revealedAt.getTime();
      if (diff > 0) {
        totalLeadTimeMs += diff;
        leadTimeCount++;
      }
    }
  }
  const avgLeadTimeMinutes = leadTimeCount > 0 ? (totalLeadTimeMs / leadTimeCount / 60000).toFixed(2) : "0.00";

  // Lista completa de premios entregados
  const deliveredTokensWithPrizes = await prisma.token.findMany({
    where: { 
      deliveredAt: { not: null }, 
      batch: batchFilter,
      ...dateFilter
    },
    select: { prize: { select: { label: true } } }
  });
  const prizeCountMap = new Map<string, number>();
  for (const t of deliveredTokensWithPrizes) {
    const label = t.prize?.label || 'Desconocido';
    prizeCountMap.set(label, (prizeCountMap.get(label) || 0) + 1);
  }
  const allDeliveredPrizes = Array.from(prizeCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  // Premios disponibles (no entregados) durante el período
  const availableTokensWithPrizes = await prisma.token.findMany({
    where: { 
      deliveredAt: null, 
      revealedAt: { not: null },
      batch: batchFilter,
      ...dateFilter
    },
    select: { prize: { select: { label: true } } }
  });
  const availablePrizeCountMap = new Map<string, number>();
  for (const t of availableTokensWithPrizes) {
    const label = t.prize?.label || 'Desconocido';
    availablePrizeCountMap.set(label, (availablePrizeCountMap.get(label) || 0) + 1);
  }
  const availablePrizes = Array.from(availablePrizeCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  // Premios no revelados durante el período
  const unrevealedTokensWithPrizes = await prisma.token.findMany({
    where: { 
      revealedAt: null, 
      batch: batchFilter, 
      ...dateFilter 
    },
    select: { prize: { select: { label: true } } }
  });
  const unrevealedPrizeCountMap = new Map<string, number>();
  for (const t of unrevealedTokensWithPrizes) {
    const label = t.prize?.label || 'Desconocido';
    unrevealedPrizeCountMap.set(label, (unrevealedPrizeCountMap.get(label) || 0) + 1);
  }
  const unrevealedPrizes = Array.from(unrevealedPrizeCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return {
    totalTokens,
    revealedTokens,
    deliveredTokens,
    unrevealedTokens,
    deliveryRate,
    scanRate,
    avgLeadTimeMinutes,
    allDeliveredPrizes,
    availablePrizes,
    unrevealedPrizes,
  };
}

export default async function StaticsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const startDateStr = searchParams?.startDate || null;
  const endDateStr = searchParams?.endDate || null;
  
  const { start, end } = getDateRange(startDateStr, endDateStr);
  
  const [metrics, birthdayMetrics, attendanceMetrics] = await Promise.all([
    getMetrics(start, end),
    getBirthdayMetrics(start, end),
    getAttendanceMetrics(start, end)
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Métricas Generales</h1>
      </div>

      <form method="GET" className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="startDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">Desde</label>
            <input type="date" name="startDate" id="startDate" defaultValue={startDateStr || ""} className="input w-full" />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="endDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">Hasta</label>
            <input type="date" name="endDate" id="endDate" defaultValue={endDateStr || ""} className="input w-full" />
          </div>

          <button type="submit" className="btn w-full">Filtrar</button>
        </div>
      </form>

      {/* SECCIÓN ASISTENCIA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
          <span className="text-2xl">⏱️</span>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Control de Asistencia</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-4">
          <div className="p-4 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 flex flex-col gap-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Total Asistencias</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {attendanceMetrics.summary.totalShifts} <span className="text-sm font-normal text-slate-500">/ {attendanceMetrics.summary.totalBusinessDays} días hábiles</span>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 flex flex-col gap-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Tasa Completitud</div>
            <div className={`text-xl font-bold ${attendanceMetrics.summary.completionRate < 90 ? 'text-warning' : 'text-success'}`}>
              {attendanceMetrics.summary.completionRate.toFixed(1)}%
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 flex flex-col gap-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Faltas de Salida</div>
            <div className="text-xl font-bold text-danger">
              {attendanceMetrics.summary.incompleteShifts}
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 flex flex-col gap-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Promedio Horas</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatMinutes(attendanceMetrics.summary.avgDurationMin)}
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {/* Top Absences */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Top Ausencias (Días faltados)</h3>
            <div className="space-y-2">
              {attendanceMetrics.topAbsences.length === 0 ? <div className="text-xs text-soft">Sin datos</div> : 
                attendanceMetrics.topAbsences.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                    <div>
                      <div className="font-medium">{p.personName}</div>
                      <div className="text-xs text-soft">{p.personCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-danger">{p.daysMissed} días</div>
                      <div className="text-xs text-soft">Asistió {p.daysAttended}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Top Incomplete */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Top Sin Marcar Salida</h3>
            <div className="space-y-2">
              {attendanceMetrics.topIncomplete.length === 0 ? <div className="text-xs text-soft">Nadie olvidó marcar salida</div> : 
                attendanceMetrics.topIncomplete.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                    <div>
                      <div className="font-medium">{p.personName}</div>
                      <div className="text-xs text-soft">{p.personCode}</div>
                    </div>
                    <div className="font-bold text-warning">{p.incompleteCount} veces</div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Top Complete */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Top Marcado Salida</h3>
            <div className="space-y-2">
              {attendanceMetrics.topComplete.length === 0 ? <div className="text-xs text-soft">Sin datos</div> : 
                attendanceMetrics.topComplete.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                    <div>
                      <div className="font-medium">{p.personName}</div>
                      <div className="text-xs text-soft">{p.personCode}</div>
                    </div>
                    <div className="font-bold text-success">{p.completeCount} veces</div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Top Duration */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Más Horas Trabajadas</h3>
            <div className="space-y-2">
              {attendanceMetrics.topDuration.length === 0 ? <div className="text-xs text-soft">Sin datos</div> : 
                attendanceMetrics.topDuration.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                    <div>
                      <div className="font-medium">{p.personName}</div>
                      <div className="text-xs text-soft">{p.personCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-success">{formatMinutes(p.totalDurationMin)}</div>
                      <div className="text-xs text-soft">Prom: {formatMinutes(p.avgDurationMin)}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 my-8"></div>

      {/* SECCIÓN CUMPLEAÑOS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
          <span className="text-2xl">🎂</span>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Sistema de Cumpleaños</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-100 dark:border-pink-800">
            <div className="card-body">
              <h3 className="card-title text-pink-800 dark:text-pink-300">Reservas Totales</h3>
              <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">{birthdayMetrics.totalReservations}</p>
              <p className="text-xs text-pink-600/70 dark:text-pink-400/70">En el periodo seleccionado</p>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-100 dark:border-emerald-800">
            <div className="card-body">
              <h3 className="card-title text-emerald-800 dark:text-emerald-300">Reservas Efectivas</h3>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{birthdayMetrics.effectiveReservations}</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Host llegó ({birthdayMetrics.effectiveRate}%)</p>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
            <div className="card-body">
              <h3 className="card-title text-blue-800 dark:text-blue-300">Invitados Reales</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{birthdayMetrics.totalGuestsArrived}</p>
                <span className="text-sm text-blue-600/70">de {birthdayMetrics.totalGuestsPlanned}</span>
              </div>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Tasa de asistencia: {birthdayMetrics.guestAttendanceRate}%</p>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-100 dark:border-amber-800">
            <div className="card-body">
              <h3 className="card-title text-amber-800 dark:text-amber-300">Canceladas</h3>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{birthdayMetrics.canceledReservations}</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Reservas caídas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 my-8"></div>

      {/* SECCIÓN TOKENS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
          <span className="text-2xl">🎟️</span>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Sistema de Tokens y Premios</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Pulseras escaneadas</h3>
              <p className="text-3xl font-bold text-blue-600">{metrics.revealedTokens}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Premios entregados</h3>
              <p className="text-3xl font-bold text-green-600">{metrics.deliveredTokens}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Pulseras desechadas</h3>
              <p className="text-3xl font-bold text-red-600">{metrics.unrevealedTokens}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Efectividad de Reparto</h3>
              <p className="text-3xl font-bold text-purple-600">{metrics.scanRate}%</p>
              <p className="text-sm text-slate-600">Escaneadas: {metrics.revealedTokens} | Desechadas: {metrics.unrevealedTokens}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Tasa de Entrega</h3>
              <p className="text-3xl font-bold text-purple-600">{metrics.deliveryRate}%</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Tiempo Promedio de Entrega</h3>
              <p className="text-3xl font-bold text-indigo-600">{metrics.avgLeadTimeMinutes} min</p>
              <p className="text-sm text-slate-600">Tiempo entre escaneo y entrega</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Premios Entregados</h3>
              <p className="text-sm text-slate-600 mb-4">Total de premios únicos: {metrics.allDeliveredPrizes.length}</p>
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Premio</th>
                    <th>Total Entregado</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.allDeliveredPrizes.map((p: { label: string; count: number }, i: number) => (
                    <tr key={i}>
                      <td>{p.label}</td>
                      <td className="font-bold">{p.count}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <td className="font-bold">Total</td>
                    <td className="font-bold">{metrics.allDeliveredPrizes.reduce((sum, p) => sum + p.count, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Premios Mostrados</h3>
              <p className="text-sm text-slate-600 mb-4">Total de premios únicos: {metrics.availablePrizes.length}</p>
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Premio</th>
                    <th>Total Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.availablePrizes.map((p: { label: string; count: number }, i: number) => (
                    <tr key={i}>
                      <td>{p.label}</td>
                      <td className="font-bold">{p.count}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <td className="font-bold">Total</td>
                    <td className="font-bold">{metrics.availablePrizes.reduce((sum, p) => sum + p.count, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Premios Desechados</h3>
              <p className="text-sm text-slate-600 mb-4">Total de premios únicos: {metrics.unrevealedPrizes.length}</p>
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Premio</th>
                    <th>Total No Revelado</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.unrevealedPrizes.map((p: { label: string; count: number }, i: number) => (
                    <tr key={i}>
                      <td>{p.label}</td>
                      <td className="font-bold">{p.count}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <td className="font-bold">Total</td>
                    <td className="font-bold">{metrics.unrevealedPrizes.reduce((sum, p) => sum + p.count, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}