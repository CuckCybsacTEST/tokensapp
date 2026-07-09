import { prisma } from '@/lib/prisma';
import { getLimaHour, limaCalendarDayWindowUtc } from '@/lib/attendanceDay';
import { computeBatchStats } from '@/lib/batchStats';

export interface DailyTokenTimelinePoint {
  hour: string;
  revealed: number;
  delivered: number;
  cumulativeRevealed: number;
  cumulativeDelivered: number;
}

export interface PublicRouletteSidebarInsight {
  id: string;
  icon: 'spark' | 'check' | 'trophy' | 'gift' | 'clock' | 'bolt' | 'chart';
  title: string;
  value: string;
  detail: string;
  tone: 'gold' | 'emerald' | 'amber';
  sortOrder: number;
}

export interface PublicRouletteSidebarSummary {
  generatedAt: string;
  insights: PublicRouletteSidebarInsight[];
}

export interface DailyTokenMetricsResult {
  day: string;
  basis: 'functionalDate' | 'createdAt-fallback';
  publicSidebar: PublicRouletteSidebarSummary;
  metrics: {
    created: number;
    printedTokens: number;
    delivered: number;
    available: number;
    breakdown: { active: number; revealedPending: number };
    expired: number;
    rouletteSpins: number;
    totalSpins: number;
    retryRevealed: number;
    loseRevealed: number;
    distinctPrizesTotal: number;
    timeline: {
      hours: DailyTokenTimelinePoint[];
      peakRevealHour: string | null;
      peakDeliveredHour: string | null;
    };
    globalHistorical: {
      createdAll: number;
      expiredAll: number;
      rouletteSpinsAll: number;
      totalSpinsAll: number;
      undeliveredAll: number;
      retryRevealedAll: number;
      loseRevealedAll: number;
    };
  };
  batches: Array<{
    batchId: string;
    description: string | null;
    createdAt: Date;
    totalTokens: number;
    delivered: number;
    active: number;
    revealedPending: number;
    expired: number;
    revealed: number;
  }>;
}

interface SpinSummaryInput {
  revealedTotal: number;
  retryRevealed: number;
  loseRevealed: number;
}

interface SidebarEventSnapshot {
  tokenId: string;
  prizeKey: string;
  prizeLabel: string;
  at: Date;
}

interface SidebarPrizeAggregate {
  prizeId: string;
  prizeKey: string;
  prizeLabel: string;
  revealedCount: number;
  deliveredCount: number;
}

interface BuildPublicRouletteSidebarSummaryInput {
  now: Date;
  lastRevealed: SidebarEventSnapshot | null;
  lastDelivered: SidebarEventSnapshot | null;
  pendingDeliveryCount: number;
  deliveredLastHour: number;
  prizeAggregates: SidebarPrizeAggregate[];
}

const PUBLIC_ROULETTE_EXCLUDED_PRIZE_KEYS = new Set(['retry', 'lose']);

const compactCountFormatter = new Intl.NumberFormat('es-PE', {
  maximumFractionDigits: 0,
});

export function summarizeSpinMetrics({ revealedTotal, retryRevealed, loseRevealed }: SpinSummaryInput) {
  return {
    totalSpins: revealedTotal,
    rouletteSpins: Math.max(0, revealedTotal - retryRevealed - loseRevealed),
  };
}

function isPublicRoulettePrize(prizeKey: string | null | undefined) {
  return !!prizeKey && !PUBLIC_ROULETTE_EXCLUDED_PRIZE_KEYS.has(prizeKey);
}

function formatRelativeTime(date: Date, now: Date) {
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1) return 'Hace instantes';
  if (totalMinutes < 60) return `Hace ${totalMinutes} min`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `Hace ${totalHours} h`;
  const totalDays = Math.floor(totalHours / 24);
  return `Hace ${totalDays} d`;
}

function formatCount(value: number) {
  return compactCountFormatter.format(value);
}

function pickTopPrize(
  prizeAggregates: SidebarPrizeAggregate[],
  metric: 'revealedCount' | 'deliveredCount'
) {
  return prizeAggregates
    .filter((item) => item[metric] > 0)
    .sort((left, right) => {
      if (right[metric] !== left[metric]) return right[metric] - left[metric];
      if (right.deliveredCount !== left.deliveredCount) return right.deliveredCount - left.deliveredCount;
      if (right.revealedCount !== left.revealedCount) return right.revealedCount - left.revealedCount;
      return left.prizeLabel.localeCompare(right.prizeLabel, 'es');
    })[0] ?? null;
}

function buildPublicRouletteSidebarSummary({
  now,
  lastRevealed,
  lastDelivered,
  pendingDeliveryCount,
  deliveredLastHour,
  prizeAggregates,
}: BuildPublicRouletteSidebarSummaryInput): PublicRouletteSidebarSummary {
  const revealedTotal = prizeAggregates.reduce((sum, item) => sum + item.revealedCount, 0);
  const deliveredTotal = prizeAggregates.reduce((sum, item) => sum + item.deliveredCount, 0);
  const deliveryRate = revealedTotal > 0 ? Math.round((deliveredTotal / revealedTotal) * 100) : 0;
  const mostDeliveredPrize = pickTopPrize(prizeAggregates, 'deliveredCount');
  const mostRevealedPrize = pickTopPrize(prizeAggregates, 'revealedCount');

  return {
    generatedAt: now.toISOString(),
    insights: [
      {
        id: 'last-revealed',
        icon: 'spark',
        title: 'Ultimo premio revelado',
        value: lastRevealed?.prizeLabel ?? 'Sin premios revelados',
        detail: lastRevealed
          ? formatRelativeTime(lastRevealed.at, now)
          : 'Aun no hay revelaciones reales hoy',
        tone: 'gold',
        sortOrder: 10,
      },
      {
        id: 'last-delivered',
        icon: 'check',
        title: 'Ultimo premio entregado',
        value: lastDelivered?.prizeLabel ?? 'Sin premios entregados',
        detail: lastDelivered
          ? formatRelativeTime(lastDelivered.at, now)
          : 'Aun no hay entregas reales hoy',
        tone: 'emerald',
        sortOrder: 20,
      },
      {
        id: 'most-delivered',
        icon: 'trophy',
        title: 'Premio mas canjeado',
        value: mostDeliveredPrize?.prizeLabel ?? 'Sin canjes aun',
        detail: mostDeliveredPrize
          ? `${formatCount(mostDeliveredPrize.deliveredCount)} canjes hoy`
          : 'Esperando el primer canje real',
        tone: 'emerald',
        sortOrder: 30,
      },
      {
        id: 'most-revealed',
        icon: 'gift',
        title: 'Premio mas revelado',
        value: mostRevealedPrize?.prizeLabel ?? 'Sin revelados aun',
        detail: mostRevealedPrize
          ? `${formatCount(mostRevealedPrize.revealedCount)} revelados hoy`
          : 'Esperando la primera revelacion real',
        tone: 'gold',
        sortOrder: 40,
      },
      {
        id: 'delivered-last-hour',
        icon: 'bolt',
        title: 'Canjes en la ultima hora',
        value: formatCount(deliveredLastHour),
        detail:
          deliveredLastHour > 0
            ? `${formatCount(deliveredLastHour)} entregas reales en 60 min`
            : 'Sin entregas reales en los ultimos 60 min',
        tone: 'emerald',
        sortOrder: 60,
      },
    ],
  };
}

async function withRetry<T>(operation: () => Promise<T>, maxRetries = 2, delay = 100): Promise<T> {
  let lastError: Error;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError!;
}

export function getLimaDayRange(dayISO: string) {
  const { startUtc, endUtcInclusive } = limaCalendarDayWindowUtc(dayISO);
  return { start: startUtc, end: endUtcInclusive };
}

export async function getDailyTokenMetrics(day: string): Promise<DailyTokenMetricsResult> {
  // Estas métricas describen el comportamiento del dia calendario Lima del evento/batch,
  // no la jornada operativa con cutoff de asistencia.
  const { start: functionalStart, end: functionalEnd } = getLimaDayRange(day);
  const anyPrisma = prisma as any;
  const now = new Date();
  const lastHourCutoff = new Date(now.getTime() - 60 * 60 * 1000);

  const batches: any[] = await withRetry(() =>
    anyPrisma.batch.findMany({
      where: { functionalDate: { gte: functionalStart, lt: functionalEnd } },
      orderBy: { createdAt: 'asc' },
      include: { tokens: { include: { prize: true } } },
    })
  );

  let basis: 'functionalDate' | 'createdAt-fallback' = 'functionalDate';
  let effectiveBatches: any[] = batches;

  if (effectiveBatches.length === 0) {
    const legacyTokens: any[] = await withRetry(() =>
      anyPrisma.token.findMany({
        where: {
          createdAt: { gte: functionalStart, lt: functionalEnd },
          batch: { functionalDate: null },
        },
        include: { prize: true, batch: true },
      })
    );

    if (legacyTokens.length) {
      const byBatch: Record<string, any> = {};
      for (const token of legacyTokens) {
        const batch = token.batch;
        if (!byBatch[token.batchId]) {
          byBatch[token.batchId] = {
            id: token.batchId,
            createdAt: batch.createdAt,
            description: batch.description,
            tokens: [] as any[],
          };
        }
        byBatch[token.batchId].tokens.push(token);
      }
      effectiveBatches = Object.values(byBatch);
      basis = 'createdAt-fallback';
    }
  }

  let created = 0;
  let delivered = 0;
  let active = 0;
  let revealedPending = 0;
  let expired = 0;
  let revealedTotal = 0;
  let retryRevealed = 0;
  let loseRevealed = 0;
  let distinctPrizesTotal = 0;
  let pendingDeliveryCount = 0;
  let deliveredLastHour = 0;
  const hoursRevealed = Array(24).fill(0);
  const hoursDelivered = Array(24).fill(0);
  const perBatch: DailyTokenMetricsResult['batches'] = [];
  const publicPrizeAggregates = new Map<string, SidebarPrizeAggregate>();
  let lastRevealed: SidebarEventSnapshot | null = null;
  let lastDelivered: SidebarEventSnapshot | null = null;

  for (const batch of effectiveBatches) {
    const stats = computeBatchStats(batch.tokens as any);
    created += stats.totalTokens;
    delivered += stats.delivered;
    active += stats.active;
    revealedPending += stats.revealedPending;
    expired += stats.expired;
    revealedTotal += stats.revealed;

    for (const prizeStat of stats.prizeStats) {
      if (prizeStat.key === 'retry') retryRevealed += prizeStat.revealed;
      if (prizeStat.key === 'lose') loseRevealed += prizeStat.revealed;
    }

    distinctPrizesTotal += new Set((batch.tokens as any[]).map((token) => token.prizeId)).size;

    for (const token of batch.tokens as any[]) {
      const revealedAt: Date | null = token.revealedAt || null;
      if (revealedAt && revealedAt >= functionalStart && revealedAt < functionalEnd) {
        const hour = getLimaHour(revealedAt);
        hoursRevealed[hour]++;
      }

      const deliveredAt: Date | null = token.deliveredAt || null;
      if (deliveredAt && deliveredAt >= functionalStart && deliveredAt < functionalEnd) {
        const hour = getLimaHour(deliveredAt);
        hoursDelivered[hour]++;
      }

      if (!isPublicRoulettePrize(token.prize?.key)) continue;

      let aggregate = publicPrizeAggregates.get(token.prizeId);
      if (!aggregate) {
        aggregate = {
          prizeId: token.prizeId,
          prizeKey: token.prize.key,
          prizeLabel: token.prize.label,
          revealedCount: 0,
          deliveredCount: 0,
        };
        publicPrizeAggregates.set(token.prizeId, aggregate);
      }

      if (revealedAt && revealedAt >= functionalStart && revealedAt < functionalEnd) {
        aggregate.revealedCount++;
        if (!lastRevealed || revealedAt > lastRevealed.at) {
          lastRevealed = {
            tokenId: token.id,
            prizeKey: token.prize.key,
            prizeLabel: token.prize.label,
            at: revealedAt,
          };
        }
      }

      if (deliveredAt && deliveredAt >= functionalStart && deliveredAt < functionalEnd) {
        aggregate.deliveredCount++;
        if (deliveredAt >= lastHourCutoff) deliveredLastHour++;
        if (!lastDelivered || deliveredAt > lastDelivered.at) {
          lastDelivered = {
            tokenId: token.id,
            prizeKey: token.prize.key,
            prizeLabel: token.prize.label,
            at: deliveredAt,
          };
        }
      }

      if (revealedAt && !deliveredAt) {
        pendingDeliveryCount++;
      }
    }

    perBatch.push({
      batchId: batch.id,
      description: batch.description,
      createdAt: batch.createdAt,
      totalTokens: stats.totalTokens,
      delivered: stats.delivered,
      active: stats.active,
      revealedPending: stats.revealedPending,
      expired: stats.expired,
      revealed: stats.revealed,
    });
  }

  const available = active + revealedPending;
  const printedTokens = created >= 120 ? 100 : Math.max(0, created - 20);
  const { totalSpins, rouletteSpins } = summarizeSpinMetrics({
    revealedTotal,
    retryRevealed,
    loseRevealed,
  });

  let peakRevealHour: string | null = null;
  let peakDeliveredHour: string | null = null;

  if (totalSpins > 0) {
    let max = -1;
    let hourIndex = 0;
    hoursRevealed.forEach((value, index) => {
      if (value > max) {
        max = value;
        hourIndex = index;
      }
    });
    peakRevealHour = String(hourIndex).padStart(2, '0');
  }

  if (delivered > 0) {
    let max = -1;
    let hourIndex = 0;
    hoursDelivered.forEach((value, index) => {
      if (value > max) {
        max = value;
        hourIndex = index;
      }
    });
    peakDeliveredHour = String(hourIndex).padStart(2, '0');
  }

  const timeline = hoursRevealed.map((_, index) => ({
    hour: String(index).padStart(2, '0'),
    revealed: hoursRevealed[index],
    delivered: hoursDelivered[index],
    cumulativeRevealed: hoursRevealed.slice(0, index + 1).reduce((sum, value) => sum + value, 0),
    cumulativeDelivered: hoursDelivered.slice(0, index + 1).reduce((sum, value) => sum + value, 0),
  }));

  const [createdAll, expiredAll, revealedAll, activeAll, revealedPendingAll, retryRevealedAll, loseRevealedAll] = await Promise.all([
    anyPrisma.token.count(),
    anyPrisma.token.count({ where: { deliveredAt: null, redeemedAt: null, expiresAt: { lt: now } } }),
    anyPrisma.token.count({ where: { revealedAt: { not: null } } }),
    anyPrisma.token.count({ where: { revealedAt: null, deliveredAt: null, redeemedAt: null, expiresAt: { gte: now } } }),
    anyPrisma.token.count({ where: { revealedAt: { not: null }, deliveredAt: null } }),
    anyPrisma.token.count({ where: { revealedAt: { not: null }, prize: { key: 'retry' } } }),
    anyPrisma.token.count({ where: { revealedAt: { not: null }, prize: { key: 'lose' } } }),
  ]);

  const historicalSpins = summarizeSpinMetrics({
    revealedTotal: revealedAll,
    retryRevealed: retryRevealedAll,
    loseRevealed: loseRevealedAll,
  });

  const publicSidebar = buildPublicRouletteSidebarSummary({
    now,
    lastRevealed,
    lastDelivered,
    pendingDeliveryCount,
    deliveredLastHour,
    prizeAggregates: Array.from(publicPrizeAggregates.values()),
  });

  return {
    day,
    basis,
    publicSidebar,
    metrics: {
      created,
      printedTokens,
      delivered,
      available,
      breakdown: { active, revealedPending },
      expired,
      rouletteSpins,
      totalSpins,
      retryRevealed,
      loseRevealed,
      distinctPrizesTotal,
      timeline: {
        hours: timeline,
        peakRevealHour,
        peakDeliveredHour,
      },
      globalHistorical: {
        createdAll,
        expiredAll,
        rouletteSpinsAll: historicalSpins.rouletteSpins,
        totalSpinsAll: historicalSpins.totalSpins,
        undeliveredAll: activeAll + revealedPendingAll,
        retryRevealedAll,
        loseRevealedAll,
      },
    },
    batches: perBatch,
  };
}