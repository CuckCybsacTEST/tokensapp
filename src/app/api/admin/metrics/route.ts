export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Quitamos uso directo de business day para métricas diarias de tokens; usamos día calendario Lima.

// Rango basado en días locales Lima (UTC-5) para evitar desfases de medianoche cuando el servidor corre en UTC.
function getLimaDateRangeForPeriod(period: string, startDate?: string, endDate?: string) {
  // Helper para obtener Date UTC a partir de componente local Lima YYYY-MM-DD HH:mm:ss.mmm
  const limaDate = (y: number, m: number, d: number, hh = 0, mm = 0, ss = 0, ms = 0) => {
    // Lima = UTC-5 => UTC = local +5h
    return new Date(Date.UTC(y, m - 1, d, hh + 5, mm, ss, ms));
  };
  const nowUtc = new Date();
  const nowLima = new Date(nowUtc.getTime() - 5 * 3600 * 1000); // shift to local
  const y = nowLima.getUTCFullYear();
  const m = nowLima.getUTCMonth() + 1;
  const d = nowLima.getUTCDate();

  // Build today boundaries in Lima
  let start: Date;
  let end: Date;

  const startOfToday = limaDate(y, m, d, 0, 0, 0, 0);
  const endOfToday = limaDate(y, m, d, 23, 59, 59, 999);

  switch (period) {
    case 'today': {
      // Día calendario local Lima
      start = limaDate(y, m, d, 0, 0, 0, 0);
      end = limaDate(y, m, d, 23, 59, 59, 999);
      break;
    }
    case 'yesterday': {
      const yest = new Date(startOfToday.getTime() - 24 * 3600 * 1000);
      start = limaDate(yest.getUTCFullYear(), yest.getUTCMonth() + 1, yest.getUTCDate(), 0, 0, 0, 0);
      end = limaDate(yest.getUTCFullYear(), yest.getUTCMonth() + 1, yest.getUTCDate(), 23, 59, 59, 999);
      break;
    }
    case 'day_before_yesterday': {
      const dbYest = new Date(startOfToday.getTime() - 2 * 24 * 3600 * 1000);
      start = limaDate(dbYest.getUTCFullYear(), dbYest.getUTCMonth() + 1, dbYest.getUTCDate(), 0, 0, 0, 0);
      end = limaDate(dbYest.getUTCFullYear(), dbYest.getUTCMonth() + 1, dbYest.getUTCDate(), 23, 59, 59, 999);
      break;
    }
    case 'this_week': {
      // Monday as first day
      const dow = (nowLima.getUTCDay() || 7); // 1..7, Monday=1
      const monday = new Date(startOfToday.getTime() - (dow - 1) * 86400000);
      start = limaDate(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate(), 0, 0, 0, 0);
      end = endOfToday; // up to current day end
      break;
    }
    case 'last_week': {
      const dow = (nowLima.getUTCDay() || 7);
      const lastWeekMonday = new Date(startOfToday.getTime() - (dow - 1 + 7) * 86400000);
      start = limaDate(lastWeekMonday.getUTCFullYear(), lastWeekMonday.getUTCMonth() + 1, lastWeekMonday.getUTCDate(), 0, 0, 0, 0);
      const sunday = new Date(start.getTime() + 6 * 86400000);
      end = limaDate(sunday.getUTCFullYear(), sunday.getUTCMonth() + 1, sunday.getUTCDate(), 23, 59, 59, 999);
      break;
    }
    case 'this_month': {
      start = limaDate(y, m, 1, 0, 0, 0, 0);
      end = endOfToday; break;
    }
    case 'last_month': {
      const prevMonth = m - 1 === 0 ? 12 : m - 1;
      const prevYear = m - 1 === 0 ? y - 1 : y;
      start = limaDate(prevYear, prevMonth, 1, 0, 0, 0, 0);
      // last day of previous month: day 0 of current month
      const lastDayDate = new Date(Date.UTC(y, m - 1, 0));
      end = limaDate(lastDayDate.getUTCFullYear(), lastDayDate.getUTCMonth() + 1, lastDayDate.getUTCDate(), 23, 59, 59, 999);
      break;
    }
    case 'custom': {
      if (!startDate || !endDate) throw new Error('CUSTOM_PERIOD_REQUIRES_DATES');
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const [ey, em, ed] = endDate.split('-').map(Number);
      start = limaDate(sy, sm, sd, 0, 0, 0, 0);
      end = limaDate(ey, em, ed, 23, 59, 59, 999);
      break;
    }
    default: { // fallback this_week
      const dow = (nowLima.getUTCDay() || 7);
      const monday = new Date(startOfToday.getTime() - (dow - 1) * 86400000);
      start = limaDate(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate(), 0, 0, 0, 0);
      end = endOfToday;
    }
  }
  return { start, end };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'this_week';
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;
  const countBasis = (url.searchParams.get('countBasis') || 'auto').toLowerCase(); // auto|ingested|created

  const now = new Date();
  const { start, end } = getLimaDateRangeForPeriod(period, startDate || undefined, endDate || undefined);

  // Para métricas de tokens necesitamos tanto totales como filtrados por período
  const [totalTokens, totalRedeemed, totalExpired, config, prizes] = await Promise.all([
    prisma.token.count(),
    prisma.token.count({ where: { redeemedAt: { not: null } } }),
    prisma.token.count({ where: { expiresAt: { lt: now } } }),
    prisma.systemConfig.findUnique({ where: { id: 1 } }),
    prisma.prize.findMany({ where: { active: true } }),
  ]);
  
  // Métricas filtradas por período
  const nowUtc = new Date();
  const [periodTokensByIngested, periodTokensByCreated, periodTokensByBatch, periodRedeemed, periodRouletteSpins, rawAvailablePlaceholder] = await Promise.all([
    (prisma as any).token.count({ where: { ingestedAt: { gte: start, lte: end } } }),
    prisma.token.count({ where: { createdAt: { gte: start, lte: end } } }),
    // Respaldo: contar por fecha de creación del batch (por si createdAt de tokens quedó fuera de rango por restauraciones/imports)
    prisma.token.count({ where: { batch: { createdAt: { gte: start, lte: end } } } }),
    prisma.token.count({ where: { redeemedAt: { gte: start, lte: end } } }),
    prisma.token.count({ where: { revealedAt: { gte: start, lte: end } } }),
    // placeholder (reemplazaremos más abajo). Se mantiene para debug comparativo.
    prisma.token.count({ where: { expiresAt: { gte: start, lte: end } } }),
  ]);
  // Selección de base para tokens del período.
  // Ajuste: para períodos diarios preferimos createdAt (emisión histórica real) y no ingestedAt
  // para no contar restauraciones masivas realizadas hoy que no corresponden a "creados hoy".
  let periodTokensBasis: ('ingested' | 'created' | 'batch-fallback' | 'event' | 'available-fallback') = 'batch-fallback';
  let periodTokens: number;
  const periodIsDaily = period === 'today' || period === 'yesterday' || period === 'day_before_yesterday';
  if (countBasis === 'ingested') {
    periodTokens = periodTokensByIngested; periodTokensBasis = 'ingested';
  } else if (countBasis === 'created') {
    periodTokens = periodTokensByCreated; periodTokensBasis = 'created';
  } else { // auto provisional (subject to event-day override below)
    if (periodIsDaily) {
      // provisional selection; final override may apply
      if (periodTokensByCreated > 0) { periodTokens = periodTokensByCreated; periodTokensBasis = 'created'; }
      else if (periodTokensByIngested > 0) { periodTokens = periodTokensByIngested; periodTokensBasis = 'ingested'; }
      else { periodTokens = periodTokensByBatch; periodTokensBasis = 'batch-fallback'; }
    } else {
      if (periodTokensByIngested > 0) { periodTokens = periodTokensByIngested; periodTokensBasis = 'ingested'; }
      else if (periodTokensByCreated > 0) { periodTokens = periodTokensByCreated; periodTokensBasis = 'created'; }
      else { periodTokens = periodTokensByBatch; periodTokensBasis = 'batch-fallback'; }
    }
  }

  // NUEVA LÓGICA basaba en functionalDate para periodos diarios.
  if (periodIsDaily) {
    // Día Lima ISO (start representa 00:00 Lima en UTC +5h) -> extraemos componente local restando 5h
    const limaDayISO = new Date(start.getTime() - 5*3600*1000).toISOString().slice(0,10); // yyyy-mm-dd
    // functionalDate se almacena como 05:00 UTC para cada día Lima => podemos comparar rango start..end directamente.
    // Tokens del evento: aquellos cuyo batch.functionalDate está dentro del rango o (legado) tokens creados en el día con batch.functionalDate null.
    const eventTokens = await prisma.token.count({
      where: {
        OR: [
          { batch: { functionalDate: { gte: start, lte: end } } },
          { AND: [ { createdAt: { gte: start, lte: end } }, { batch: { functionalDate: null } } ] }
        ]
      }
    });
    periodTokens = eventTokens;
    periodTokensBasis = 'event';
    (globalThis as any).__eventDailyDebug = { functionalDate: true, limaDayISO };
  }

  // Fallback extra: si es diario y no encontramos nada pero sí hay tokens "disponibles" (expires dentro del período)
  if (periodIsDaily && periodTokens === 0 && rawAvailablePlaceholder > 0) {
    periodTokens = rawAvailablePlaceholder;
    periodTokensBasis = 'available-fallback';
  }

  // periodIsDaily ya definido arriba
  const debugEnabled = url.searchParams.get('debug') === '1';
  let localSqlCount: number | null = null;
  if (periodIsDaily && periodTokens === 0 && countBasis !== 'ingested') {
    // Derivar fecha local (Lima) a partir del start UTC (start ya es 00:00 Lima => +5h en UTC)
    const localDayISO = new Date(start.getTime() - 5 * 3600 * 1000).toISOString().slice(0,10);
    try {
      // Convertir createdAt a hora Lima restando 5 horas y truncar a date
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(1)::int AS c FROM "Token" WHERE ((("createdAt" AT TIME ZONE 'UTC') - INTERVAL '5 hours')::date) = '${localDayISO}'`);
      localSqlCount = Number(rows?.[0]?.c || 0);
      if (localSqlCount > 0) periodTokens = localSqlCount;
    } catch {
      // ignorar
    }
  }

  // Lógica adicional: si aún es 0 para períodos diarios, intentar inferir por 'fecha lógica' dentro del description del batch (ej: FIX_SHOW 27.09.2025)
  // Esto permite mapear tokens restaurados cuya createdAt no corresponde al día del evento.
  let logicalDateAugmentApplied = false;
  let logicalDateCount = 0;
  if (periodIsDaily && periodTokens === 0) {
    // Convertimos start (que es 00:00 Lima -> UTC) a día Lima ISO (yyyy-mm-dd)
    const limaDayISO = new Date(start.getTime() - 5*3600*1000).toISOString().slice(0,10); // local date string
    // Día / mes / año buscado
    const [yy, mm, dd] = limaDayISO.split('-');
    const targetDMY = `${dd}.${mm}.${yy}`; // para comparación flexible
    // Cargar batches recientes (limit)
    const recentBatches = await prisma.batch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { tokens: { select: { id: true }, take: 1 } },
      where: { tokens: { some: {} } }
    });
    const dateRegex = /(\d{2})\.(\d{2})\.(\d{4})/;
    const batchIdsToInclude: string[] = [];
    for (const b of recentBatches) {
      if (!b.description) continue;
      const m = b.description.match(dateRegex);
      if (!m) continue;
      const dmy = `${m[1]}.${m[2]}.${m[3]}`;
      if (dmy === targetDMY) {
        batchIdsToInclude.push(b.id);
      }
    }
    if (batchIdsToInclude.length) {
      logicalDateCount = await prisma.token.count({ where: { batchId: { in: batchIdsToInclude } } });
      if (logicalDateCount > 0) {
        periodTokens = logicalDateCount;
        periodTokensBasis = 'batch-fallback';
        logicalDateAugmentApplied = true;
      }
    }
  }
  
  // Cálculo de tokens activos (global)
  const activeTokens = totalTokens - totalRedeemed - totalExpired;
  
  // Tokens pendientes = suma de stock numérico > 0 (solo premios activos)
  const pending = prizes.reduce((acc: number, p: any) => (typeof p.stock === "number" && p.stock > 0 ? acc + p.stock : acc), 0);
  
  // Total emitidos acumulado = suma de emittedTotal (campo del modelo Prize)
  const emittedAggregate = prizes.reduce((acc: number, p: any) => acc + (p.emittedTotal || 0), 0);
  
  return NextResponse.json({
    // Métricas globales
    total: totalTokens,
    redeemed: totalRedeemed,
    expired: totalExpired,
    active: activeTokens < 0 ? 0 : activeTokens,
    pending,
    emittedAggregate,
  tokensEnabled: config?.tokensEnabled ?? false,
    
    // Métricas del período seleccionado
    period: {
      name: period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
  tokens: periodTokens,
      tokensBasis: periodTokensBasis,
      redeemed: periodRedeemed,
      rouletteSpins: periodRouletteSpins,
  available: 0, // se calcula más abajo
    },
    ...(debugEnabled ? { debug: {
      periodIsDaily,
      requestedBasis: countBasis,
      counts: { byIngested: periodTokensByIngested, byCreated: periodTokensByCreated },
      selected: { periodTokens, periodTokensBasis }
    } } : {}),
    ...(debugEnabled ? { debug: await (async () => {
      // Sample últimos 5 tokens y batches para entender fechas
      let sampleTokens: any[] = [];
      let sampleBatches: any[] = [];
      try {
        sampleTokens = await prisma.token.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, createdAt: true, batchId: true } });
        sampleBatches = await prisma.batch.findMany({ orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, createdAt: true, description: true } });
      } catch {}
  const eventDailyDebug = (globalThis as any).__eventDailyDebug;
      return {
        rangeUtc: { start: start.toISOString(), end: end.toISOString() },
  counts: { byIngested: periodTokensByIngested, byCreated: periodTokensByCreated, byBatch: periodTokensByBatch, rawAvailablePlaceholder, localSql: localSqlCount, selectedBasis: periodTokensBasis, requestedBasis: countBasis },
        logicalDateAugment: logicalDateAugmentApplied ? { logicalDateCount, note: 'Derivado de fecha en descripcion de batch' } : undefined,
  eventDaily: periodIsDaily ? { functionalDate: eventDailyDebug?.functionalDate, limaDayISO: eventDailyDebug?.limaDayISO } : undefined,
        samples: {
          tokens: sampleTokens.map(t => ({ id: t.id, createdAt: t.createdAt.toISOString(), batchId: t.batchId })),
          batches: sampleBatches.map(b => ({ id: b.id, createdAt: b.createdAt.toISOString(), desc: b.description }))
        }
      };
    })() } : {})
  });
}
