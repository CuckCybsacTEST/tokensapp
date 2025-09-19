/*
 Reconciles Prize metrics with actual Token data across the entire DB.
 - emittedTotal := count(tokens where prizeId)
 - lastEmittedAt := max(current lastEmittedAt, latest token.createdAt)
 - stock := 0 if there are tokens and stock is null; otherwise keep current value
 Usage:
   DATABASE_URL="file:./prisma/dev.db" tsx scripts/reconcile-prizes.ts
*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PrismaLib = require('@prisma/client') as { PrismaClient: new () => any };
const db: any = new PrismaLib.PrismaClient();

function fmt(d?: Date | null) {
  return d ? new Date(d).toISOString().replace('T', ' ').slice(0, 19) : '-';
}

async function main() {
  const prizes: Array<{ id: string; key: string; label: string; emittedTotal: number; stock: number | null; lastEmittedAt: Date | null }> = await db.prize.findMany({
    select: { id: true, key: true, label: true, emittedTotal: true, stock: true, lastEmittedAt: true },
  });
  if (!prizes.length) {
    console.log('No prizes found.');
    return;
  }
  const prizeIds = prizes.map(p => p.id);
  const agg: Array<{ prizeId: string; _count: { _all: number }; _max: { createdAt: Date | null } }> = await db.token.groupBy({
    by: ['prizeId'],
    where: { prizeId: { in: prizeIds } },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const mapAgg = new Map(agg.map(a => [a.prizeId, a]));

  let updates = 0;
  for (const p of prizes) {
    const a = mapAgg.get(p.id);
    const tokenCount = a?._count._all ?? 0;
    const latestTokenAt = a?._max.createdAt ?? null;
    let nextEmitted = p.emittedTotal;
    let nextStock = p.stock;
    let nextLast = p.lastEmittedAt;

    if (nextEmitted !== tokenCount) nextEmitted = tokenCount;
    if (tokenCount > 0) {
      if (nextStock == null) nextStock = 0;
      if (latestTokenAt && (!nextLast || latestTokenAt > nextLast)) nextLast = latestTokenAt;
    }

    const changed = nextEmitted !== p.emittedTotal || nextStock !== p.stock || (nextLast?.getTime?.() ?? 0) !== (p.lastEmittedAt?.getTime?.() ?? 0);
    if (changed) {
  await db.prize.update({ where: { id: p.id }, data: { emittedTotal: nextEmitted, stock: nextStock, lastEmittedAt: nextLast ?? undefined } });
      console.log(`Updated ${p.key} (${p.id}) '${p.label}': emittedTotal ${p.emittedTotal} -> ${nextEmitted}, stock ${p.stock} -> ${nextStock}, lastEmittedAt ${fmt(p.lastEmittedAt)} -> ${fmt(nextLast)}`);
      updates++;
    }
  }
  console.log(`Done. Prizes updated: ${updates}/${prizes.length}`);
}

main().catch((e: any) => {
  console.error('Reconcile failed:', e);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
