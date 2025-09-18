import { prisma } from "@/lib/prisma";
import PrizesClient from "./PrizesClient";

export const dynamic = "force-dynamic";

async function getPrizesWithLastBatch() {
  const prizes = await prisma.prize.findMany({ orderBy: { createdAt: "asc" } });
  if (!prizes.length) return { prizes: [], lastBatch: {} } as any;
  const prizeIds = prizes.map((p) => p.id);

  // Obtener tokens ordenados por creación desc para los premios involucrados (para last batch)
  const tokens = await prisma.token.findMany({
    where: { prizeId: { in: prizeIds } },
    orderBy: { createdAt: "desc" },
    select: {
      prizeId: true,
      batch: { select: { id: true, description: true, createdAt: true } },
      revealedAt: true,
      deliveredAt: true,
    },
  });

  const seen = new Set<string>();
  const lastBatch: Record<string, { id: string; name: string; createdAt: Date }> = {};
  const revealedCount: Record<string, number> = {};
  const deliveredCount: Record<string, number> = {};

  for (const t of tokens) {
    if (!seen.has(t.prizeId) && t.batch) {
      seen.add(t.prizeId);
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

  // Fusionar counts a los objetos de premios (propiedades extra para el cliente)
  const enriched = prizes.map((p) => ({
    ...p,
    revealedCount: revealedCount[p.id] || 0,
    deliveredCount: deliveredCount[p.id] || 0,
  }));
  return { prizes: enriched, lastBatch } as any;
}

export default async function PrizesPage() {
  const { prizes, lastBatch } = await getPrizesWithLastBatch();
  return <PrizesClient initialPrizes={prizes} lastBatch={lastBatch} />;
}
