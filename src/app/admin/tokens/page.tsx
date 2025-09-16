import { prisma } from "@/lib/prisma";
import { TokensToggle } from "@/app/admin/TokensToggle";
import MetricsDashboard from "../MetricsDashboard";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function getMetrics() {
  const now = new Date();
  const [totalTokens, totalRedeemed, totalExpired, config, prizes] = await Promise.all([
    prisma.token.count(),
    prisma.token.count({ where: { redeemedAt: { not: null } } }),
    prisma.token.count({ where: { expiresAt: { lt: now } } }),
    prisma.systemConfig.findUnique({ where: { id: 1 } }),
    prisma.prize.findMany({ where: { active: true } }),
  ]);

  const startOfWeek = new Date();
  const dayOfWeek = startOfWeek.getDay() || 7;
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date();
  endOfWeek.setHours(23, 59, 59, 999);

  const [periodTokens, periodRedeemed, periodRouletteSpins, periodRouletteSessions] = await Promise.all([
    prisma.token.count({ where: { createdAt: { gte: startOfWeek, lte: endOfWeek } } }),
    prisma.token.count({ where: { redeemedAt: { gte: startOfWeek, lte: endOfWeek } } }),
    (prisma as any).rouletteSpin.count({ where: { createdAt: { gte: startOfWeek, lte: endOfWeek } } }),
    (prisma as any).rouletteSession.count({ where: { createdAt: { gte: startOfWeek, lte: endOfWeek } } }),
  ]);

  const activeTokens = totalTokens - totalRedeemed - totalExpired;
  const pending = prizes.reduce((acc: number, p: any) => (typeof p.stock === "number" && p.stock > 0 ? acc + p.stock : acc), 0);
  const emittedAggregate = prizes.reduce((acc: number, p: any) => acc + (p.emittedTotal || 0), 0);

  return {
    total: totalTokens,
    redeemed: totalRedeemed,
    expired: totalExpired,
    active: activeTokens < 0 ? 0 : activeTokens,
    pending,
    emittedAggregate,
    tokensEnabled: config?.tokensEnabled ?? true,
    period: {
      name: "this_week",
      startDate: startOfWeek.toISOString(),
      endDate: endOfWeek.toISOString(),
      tokens: periodTokens,
      redeemed: periodRedeemed,
      rouletteSessions: periodRouletteSessions,
      rouletteSpins: periodRouletteSpins,
    },
  };
}

export default async function TokensPanelPage() {
  const m = await getMetrics();
  const tz = process.env.TOKENS_TIMEZONE || 'America/Lima';
  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
        <div className="flex items-center mb-5">
          <div className="mr-3 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Control del Sistema</h2>
        </div>
        <div className="text-sm opacity-70 mb-2">Zona horaria programada: {tz} (activación 18:00, desactivación 00:00)</div>
        <TokensToggle initialEnabled={m.tokensEnabled} />
      </div>

      <Suspense fallback={
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg animate-pulse h-80 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center mb-8">
            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg mr-4"></div>
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="h-24 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-32 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
              <div className="h-32 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
              <div className="h-32 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
            </div>
          </div>
        </div>
      }>
        <MetricsDashboard initialMetrics={m} />
      </Suspense>
    </div>
  );
}
