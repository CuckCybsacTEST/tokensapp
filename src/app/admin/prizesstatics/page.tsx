import { prisma } from "@/lib/prisma";
import PrizestaticsClient from "./PrizestaticsClient";
import { AdminLayout } from "@/components/AdminLayout";

export const metadata = { title: 'Lotes Estáticos' };
export const dynamic = "force-dynamic";

async function getPrizesWithStats() {
  const prizes = await prisma.prize.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      label: true,
      color: true,
      active: true,
      stock: true,
      key: true,
      emittedTotal: true,
    }
  });

  // Último lote por premio
  const lastTokens = await prisma.token.findMany({
    where: { prizeId: { in: prizes.map(p => p.id) } },
    orderBy: [{ prizeId: 'asc' }, { createdAt: 'desc' }],
    distinct: ['prizeId'],
    select: { prizeId: true, batch: { select: { id: true, description: true, createdAt: true } } },
  });
  const lastBatch: Record<string, { id: string; name: string; createdAt: Date }> = {};
  for (const t of lastTokens) {
    if (t.batch) {
      lastBatch[t.prizeId] = {
        id: t.batch.id,
        name: t.batch.description || t.batch.id,
        createdAt: t.batch.createdAt,
      };
    }
  }

  // Estadísticas recientes por batch
  const recentBatches = await prisma.batch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: { id: true, description: true, createdAt: true }
  });
  const batchPrizeStats = [];
  if (recentBatches.length) {
    const grouped = await prisma.token.groupBy({
      by: ['batchId', 'prizeId'],
      where: { batchId: { in: recentBatches.map(b => b.id) } },
      _count: { _all: true },
    });
    const prizeMap = new Map(prizes.map(p => [p.id, p]));
    const perBatch: Record<string, any[]> = {};
    for (const row of grouped) {
      if (!perBatch[row.batchId]) perBatch[row.batchId] = [];
      const p = prizeMap.get(row.prizeId);
      perBatch[row.batchId].push({
        prizeId: row.prizeId,
        label: p?.label || row.prizeId,
        color: p?.color || null,
        count: row._count._all,
        expired: 0,
        valid: 0
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

  return { prizes, lastBatch, batchPrizeStats };
}

export default async function PrizestaticsPage() {
  const { prizes, lastBatch, batchPrizeStats } = await getPrizesWithStats();
  return (
    <AdminLayout>
      <PrizestaticsClient prizes={prizes} lastBatch={lastBatch} batchPrizeStats={batchPrizeStats} />
    </AdminLayout>
  );
}
