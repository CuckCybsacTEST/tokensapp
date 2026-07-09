import { businessDayWindowUtc, limaCalendarDayWindowUtc } from '@/lib/attendanceDay';
import { rangeBusinessDays, type Period } from '@/lib/date';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type TokenPeriodMetrics = {
  period: Period;
  startDay: string;
  endDay: string;
  startDate: string;
  endDate: string;
  tokens: number;
  redeemed: number;
  delivered: number;
  revealed: number;
  disabled: number;
  expired: number;
  available: number;
  rouletteSpins: number;
};

export type GlobalTokenMetrics = {
  total: number;
  redeemed: number;
  expired: number;
  active: number;
  pending: number;
  emittedAggregate: number;
  tokensEnabled: boolean;
};

function buildPeriodWindows(period: Period, startDate?: string, endDate?: string) {
  const { name, startDay, endDay } = rangeBusinessDays(period, startDate, endDate);
  const operationalStart = businessDayWindowUtc(startDay).startUtc;
  const operationalEnd = businessDayWindowUtc(endDay).endUtc;
  const calendarStart = limaCalendarDayWindowUtc(startDay).startUtc;
  const calendarEnd = limaCalendarDayWindowUtc(endDay).endUtc;
  return {
    name,
    startDay,
    endDay,
    operationalStart,
    operationalEnd,
    calendarStart,
    calendarEnd,
  };
}

export async function getGlobalTokenMetrics(): Promise<GlobalTokenMetrics> {
  const now = new Date();
  const [totalTokens, totalRedeemed, totalExpired, config, prizes] = await Promise.all([
    prisma.token.count(),
    prisma.token.count({ where: { redeemedAt: { not: null } } }),
    prisma.token.count({ where: { expiresAt: { lt: now } } }),
    prisma.systemConfig.findUnique({ where: { id: 1 } }),
    prisma.prize.findMany({ where: { active: true } }),
  ]);

  const pending = prizes.reduce((acc: number, prize: any) => (
    typeof prize.stock === 'number' && prize.stock > 0 ? acc + prize.stock : acc
  ), 0);

  const emittedAggregate = prizes.reduce((acc: number, prize: any) => acc + (prize.emittedTotal || 0), 0);

  return {
    total: totalTokens,
    redeemed: totalRedeemed,
    expired: totalExpired,
    active: Math.max(0, totalTokens - totalRedeemed - totalExpired),
    pending,
    emittedAggregate,
    tokensEnabled: config?.tokensEnabled ?? false,
  };
}

export async function getTokenPeriodMetrics(args: { period: Period; startDate?: string; endDate?: string; batchId?: string }) {
  const { period, startDate, endDate, batchId } = args;
  const windows = buildPeriodWindows(period, startDate, endDate);
  const baseFilter = batchId ? { batchId } : {};
  const tokenScopeWhere: Prisma.TokenWhereInput = {
    OR: [
      { batch: { functionalDate: { gte: windows.calendarStart, lt: windows.calendarEnd } } },
      {
        AND: [
          { createdAt: { gte: windows.operationalStart, lt: windows.operationalEnd } },
          { batch: { functionalDate: null } },
        ],
      },
    ],
  } as const;

  const [tokens, redeemed, delivered, revealed, disabled, expired, rouletteSpins] = await Promise.all([
    prisma.token.count({ where: { ...baseFilter, ...tokenScopeWhere } }),
    prisma.token.count({ where: { ...baseFilter, redeemedAt: { not: null, gte: windows.operationalStart, lt: windows.operationalEnd } } }),
    prisma.token.count({ where: { ...baseFilter, deliveredAt: { not: null, gte: windows.operationalStart, lt: windows.operationalEnd } } }),
    prisma.token.count({ where: { ...baseFilter, revealedAt: { not: null, gte: windows.operationalStart, lt: windows.operationalEnd } } }),
    prisma.token.count({ where: { ...baseFilter, disabled: true, createdAt: { gte: windows.operationalStart, lt: windows.operationalEnd } } }),
    prisma.token.count({ where: { ...baseFilter, expiresAt: { gte: windows.operationalStart, lt: windows.operationalEnd } } }),
    prisma.rouletteSpin.count({ where: { createdAt: { gte: windows.operationalStart, lt: windows.operationalEnd }, ...(batchId ? { session: { batchId } } : {}) } }),
  ]);

  return {
    period: windows.name,
    startDay: windows.startDay,
    endDay: windows.endDay,
    startDate: windows.operationalStart.toISOString(),
    endDate: windows.operationalEnd.toISOString(),
    tokens,
    redeemed,
    delivered,
    revealed,
    disabled,
    expired,
    available: Math.max(0, tokens - redeemed - expired),
    rouletteSpins,
  } satisfies TokenPeriodMetrics;
}
