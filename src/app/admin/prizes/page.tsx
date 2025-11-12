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
  prizes: Array<{
    prizeId: string;
    label: string;
    color: string | null;
    count: number;
    expired: number;
    valid: number;
  }>;
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

  // Último lote por premio (robusto): usamos distinct por prizeId ordenado por createdAt desc
  const lastTokens = await prisma.token.findMany({
    where: { prizeId: { in: prizeIds } },
    orderBy: [{ prizeId: 'asc' }, { createdAt: 'desc' }],
    distinct: ['prizeId'],
    select: { prizeId: true, batch: { select: { id: true, description: true, createdAt: true } } },
  });
  const lastBatch: LastBatchMap = {};
  for (const t of lastTokens) {
    if (t.batch) {
      lastBatch[t.prizeId] = {
        id: t.batch.id,
        name: t.batch.description || t.batch.id,
        createdAt: t.batch.createdAt,
      };
    }
  }

  // Agregados correctos para mostrador: revelados (pendientes) y consumidos (entregados o legacy redeemed)
  const revealedAgg = await prisma.token.groupBy({
    by: ['prizeId'],
    where: { prizeId: { in: prizeIds }, revealedAt: { not: null }, deliveredAt: null },
    _count: { _all: true },
  });
  const deliveredAgg = await prisma.token.groupBy({
    by: ['prizeId'],
    where: { prizeId: { in: prizeIds }, OR: [{ deliveredAt: { not: null } }, { redeemedAt: { not: null } }] },
    _count: { _all: true },
  });
  const revealedCount: Record<string, number> = Object.fromEntries(revealedAgg.map(r => [r.prizeId, r._count._all]));
  const deliveredCount: Record<string, number> = Object.fromEntries(deliveredAgg.map(r => [r.prizeId, r._count._all]));

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
        expired: 0, // valor por defecto
        valid: 0    // valor por defecto
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
