import { prisma } from "@/lib/prisma";
import PrizesClient from "./PrizesClient";

export const metadata = { title: 'Premios' };
export const dynamic = "force-dynamic"; // evitar cache SSR para panel admin

// Tipos enriquecidos
type BasePrize = Awaited<ReturnType<typeof prisma.prize.findMany>>[number];
type PrizeWithStats = BasePrize & { revealedCount: number; deliveredCount: number };
type LastBatchMap = Record<string, { id: string; name: string; createdAt: Date }>;
type BatchPrizeStat = {
  batchId: string;
  description: string;
  createdAt: Date;
  prizes: Array<{ prizeId: string; label: string; color: string | null; count: number }>;
};

async function getPrizesWithLastBatch(): Promise<{
  prizes: PrizeWithStats[];
  lastBatch: LastBatchMap;
  batchPrizeStats: BatchPrizeStat[];
}> {
  const prizes = await prisma.prize.findMany({ orderBy: { createdAt: "asc" } });
  if (!prizes.length) {
    return { prizes: [], lastBatch: {}, batchPrizeStats: [] };
  }

  const prizeIds = prizes.map((p: BasePrize) => p.id);

  // OPT: Limitamos el número de tokens escaneados para encontrar último batch por premio.
  const tokens = await prisma.token.findMany({
    where: { prizeId: { in: prizeIds } },
    orderBy: { createdAt: 'desc' },
    take: prizeIds.length * 6, // heurística: suficiente para encontrar el último batch de cada premio
    select: {
      prizeId: true,
      batch: { select: { id: true, description: true, createdAt: true } },
      revealedAt: true,
      deliveredAt: true,
    },
  });

  const lastBatch: LastBatchMap = {};
  const revealedCount: Record<string, number> = {};
  const deliveredCount: Record<string, number> = {};
  const seenBatchPerPrize = new Set<string>();

  for (const t of tokens) {
    if (t.batch && !seenBatchPerPrize.has(t.prizeId)) {
      seenBatchPerPrize.add(t.prizeId);
      lastBatch[t.prizeId] = {
        id: t.batch.id,
        name: t.batch.description || t.batch.id,
        createdAt: t.batch.createdAt,
      };
    }
    if (t.revealedAt && !t.deliveredAt) {
      revealedCount[t.prizeId] = (revealedCount[t.prizeId] || 0) + 1;
    }
    if (t.deliveredAt) {
      deliveredCount[t.prizeId] = (deliveredCount[t.prizeId] || 0) + 1;
    }
  }

  const enriched: PrizeWithStats[] = prizes.map((p: BasePrize) => ({
    ...p,
    revealedCount: revealedCount[p.id] || 0,
    deliveredCount: deliveredCount[p.id] || 0,
  }));

  // Estadísticas recientes por batch
  const recentBatches = await prisma.batch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: { id: true, description: true, createdAt: true }
  });
  const batchPrizeStats: BatchPrizeStat[] = [];
  if (recentBatches.length) {
    const grouped = await prisma.token.groupBy({
      by: ['batchId', 'prizeId'],
  where: { batchId: { in: recentBatches.map((b: typeof recentBatches[number]) => b.id) } },
      _count: { _all: true },
    });
    const prizeMap = new Map(enriched.map(p => [p.id, p]));
    const perBatch: Record<string, BatchPrizeStat['prizes']> = {};
    for (const row of grouped) {
      if (!perBatch[row.batchId]) perBatch[row.batchId] = [];
      const p = prizeMap.get(row.prizeId);
      perBatch[row.batchId].push({
        prizeId: row.prizeId,
        label: p?.label || row.prizeId,
        color: p?.color || null,
        count: row._count._all,
      });
    }
    for (const b of recentBatches) {
      batchPrizeStats.push({
        batchId: b.id,
        description: b.description || b.id,
        createdAt: b.createdAt,
        prizes: (perBatch[b.id] || []).sort((a, b) => a.label.localeCompare(b.label)),
      });
    }
  }

  return { prizes: enriched, lastBatch, batchPrizeStats };
}

export default async function PrizesPage() {
  const { prizes, lastBatch, batchPrizeStats } = await getPrizesWithLastBatch();
  return (
    <PrizesClient
      initialPrizes={prizes}
      lastBatch={lastBatch}
      batchPrizeStats={batchPrizeStats}
    />
  );
}
