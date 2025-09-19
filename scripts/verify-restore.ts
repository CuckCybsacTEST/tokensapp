/*
 Verification script for restore status.
 Reports totals for Batches, Prizes, Tokens; shows last batches with token counts;
 validates Prize metrics (emittedTotal, stock, lastEmittedAt) against actual tokens.
 Usage:
   DATABASE_URL="file:./prisma/dev.db" tsx scripts/verify-restore.ts
*/

// PrismaClient carga en tiempo de ejecución (evita errores si no está generado)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client") as { PrismaClient: any };
const prisma: any = new PrismaClient();

function fmtDate(d?: Date | null) {
  return d ? new Date(d).toISOString().replace("T", " ").slice(0, 19) : "-";
}

async function main() {
  const [batchesTotal, prizesTotal, tokensTotal] = await Promise.all([
    prisma.batch.count(),
    prisma.prize.count(),
    prisma.token.count(),
  ]);

  console.log("Totals:");
  console.log(`- Batches: ${batchesTotal}`);
  console.log(`- Prizes:  ${prizesTotal}`);
  console.log(`- Tokens:  ${tokensTotal}`);

  // Show last 10 batches with token counts
  const lastBatches: Array<{ id: string; description: string | null; createdAt: Date }> = await prisma.batch.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, description: true, createdAt: true },
  });
  const batchIds = lastBatches.map((b: { id: string }) => b.id);
  const tokensByBatch: Array<{ batchId: string; _count: { _all: number } }> = await prisma.token.groupBy({
    by: ["batchId"],
    where: { batchId: { in: batchIds } },
    _count: { _all: true },
  });
  const mapCountByBatch = new Map(tokensByBatch.map((t: { batchId: string; _count: { _all: number } }) => [t.batchId, t._count._all]));

  console.log("\nLast batches (max 10):");
  for (const b of lastBatches) {
    const count = mapCountByBatch.get(b.id) ?? 0;
    console.log(`- ${b.id} | ${fmtDate(b.createdAt)} | ${b.description ?? "(no description)"} | tokens=${count}`);
  }

  // Validate prize metrics: emittedTotal and lastEmittedAt derived from tokens
  const tokenAggByPrize: Array<{ prizeId: string; _count: { _all: number }; _max: { createdAt: Date | null; revealedAt: Date | null; redeemedAt: Date | null } }> = await prisma.token.groupBy({
    by: ["prizeId"],
    _count: { _all: true },
    _max: { createdAt: true, revealedAt: true, redeemedAt: true },
  });
  const prizeIds = tokenAggByPrize.map((t: { prizeId: string }) => t.prizeId);
  const prizes: Array<{ id: string; key: string; label: string; emittedTotal: number; stock: number | null; lastEmittedAt: Date | null; createdAt: Date }> = await prisma.prize.findMany({
    where: { id: { in: prizeIds } },
    select: {
      id: true,
      key: true,
      label: true,
      emittedTotal: true,
      stock: true,
      lastEmittedAt: true,
      createdAt: true,
    },
  });
  const prizeById = new Map(prizes.map((p: { id: string }) => [p.id, p]));

  const mismatches: Array<{ id: string; key: string; label: string; expected: number; actual: number; stock?: number | null; lastEmittedAt?: Date | null }>= [];
  for (const agg of tokenAggByPrize) {
    const p = prizeById.get(agg.prizeId) as { id: string; key: string; label: string; emittedTotal: number; stock: number | null; lastEmittedAt: Date | null } | undefined;
    if (!p) continue;
    const actual = agg._count._all;
    const expected = p.emittedTotal ?? 0;
    if (actual !== expected || p.stock !== 0 || !p.lastEmittedAt) {
      mismatches.push({ id: p.id, key: p.key, label: p.label, expected, actual, stock: p.stock, lastEmittedAt: p.lastEmittedAt });
    }
  }

  console.log("\nPrize metrics validation (expect emittedTotal == tokens, stock == 0, lastEmittedAt != null for emitted prizes):");
  if (mismatches.length === 0) {
    console.log("- OK: All prizes aligned.");
  } else {
    for (const m of mismatches) {
      console.log(`- Prize ${m.key} (${m.id}) '${m.label}': emittedTotal=${m.expected}, tokens=${m.actual}, stock=${m.stock ?? "null"}, lastEmittedAt=${fmtDate(m.lastEmittedAt ?? undefined)}`);
    }
  }

  // Quick classification counts
  const emittedPrizes = await prisma.prize.count({ where: { emittedTotal: { gt: 0 } } });
  const pendingPrizes = await prisma.prize.count({ where: { emittedTotal: 0 } });
  console.log("\nClassification:");
  console.log(`- Emitidos (emittedTotal>0): ${emittedPrizes}`);
  console.log(`- Pendientes (emittedTotal=0): ${pendingPrizes}`);
}

main()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
