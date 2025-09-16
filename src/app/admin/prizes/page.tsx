import { prisma } from "@/lib/prisma";
import PrizesClient from "./PrizesClient";

export const dynamic = "force-dynamic";

async function getPrizesWithLastBatch() {
  const prizes = await prisma.prize.findMany({ orderBy: { createdAt: "asc" } });
  if (!prizes.length) return { prizes: [], lastBatch: {} } as any;
  const prizeIds = prizes.map((p) => p.id);
  // Obtener tokens ordenados por creación desc para los premios involucrados
  const tokens = await prisma.token.findMany({
    where: { prizeId: { in: prizeIds } },
    orderBy: { createdAt: "desc" },
    select: {
      prizeId: true,
      batch: { select: { id: true, description: true, createdAt: true } },
    },
  });
  const seen = new Set<string>();
  const lastBatch: Record<string, { id: string; name: string; createdAt: Date }> = {};
  for (const t of tokens) {
    if (!seen.has(t.prizeId) && t.batch) {
      seen.add(t.prizeId);
      lastBatch[t.prizeId] = {
        id: t.batch.id,
        name: t.batch.description || t.batch.id,
        createdAt: t.batch.createdAt,
      };
    }
  }
  return { prizes, lastBatch } as any;
}

export default async function PrizesPage() {
  const { prizes, lastBatch } = await getPrizesWithLastBatch();
  return <PrizesClient initialPrizes={prizes} lastBatch={lastBatch} />;
}
