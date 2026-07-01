import { prisma } from "@/lib/prisma";
import type { WelcomePlayerPrize } from "./types";
import type { WelcomePlayersSpinResult } from "./engine";

type SpinRecord = {
  id: string;
  prizeId: string;
  prizeLabel: string;
  prizeColor: string;
  createdAt: Date;
};

export async function recordWelcomePlayersSpin(result: WelcomePlayersSpinResult) {
  await (prisma as any).welcomePlayersSpin.create({
    data: {
      id: result.spinId,
      prizeId: result.prize.id,
      prizeLabel: result.prize.label,
      prizeColor: result.prize.color,
      prizeOrder: result.prize.order,
      prizeWeight: result.prize.weight,
      rotation: result.rotation,
      turns: result.turns,
    },
  });
}

export async function getWelcomePlayersState(prizes: WelcomePlayerPrize[]) {
  const active = prizes.filter((prize) => prize.status === "active").sort((a, b) => a.order - b.order);
  const [totalSpins, grouped, records] = await Promise.all([
    (prisma as any).welcomePlayersSpin.count(),
    (prisma as any).welcomePlayersSpin.groupBy({
      by: ["prizeId", "prizeLabel", "prizeColor"],
      _count: { _all: true },
    }),
    (prisma as any).welcomePlayersSpin.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        prizeId: true,
        prizeLabel: true,
        prizeColor: true,
        createdAt: true,
      },
    }),
  ]) as [number, Array<{ prizeId: string; prizeLabel: string; prizeColor: string; _count: { _all: number } }>, SpinRecord[]];

  const prizeCounts = active.map((prize) => ({
    prizeId: prize.id,
    label: prize.label,
    color: prize.color,
    count: grouped.find((row) => row.prizeId === prize.id)?._count._all || 0,
  }));

  const topPrize = [...prizeCounts].sort((a, b) => b.count - a.count)[0] || null;
  const lastPrize = records[0]
    ? {
        prizeId: records[0].prizeId,
        label: records[0].prizeLabel,
        color: records[0].prizeColor,
        createdAt: records[0].createdAt.toISOString(),
      }
    : null;

  return {
    totalSpins,
    activePrizes: active.length,
    topPrize,
    lastPrize,
    prizeCounts,
    recentSpins: records.slice(0, 20).map((record) => ({
      spinId: record.id,
      prizeId: record.prizeId,
      label: record.prizeLabel,
      color: record.prizeColor,
      createdAt: record.createdAt.toISOString(),
    })),
  };
}
