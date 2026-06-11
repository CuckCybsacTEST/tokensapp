import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const batchId = 'cmq7211vm01qdnguqm3ux5gua';
  const oldLabel = '(NUEVO) JAGERMEISTER COLD BREW COFFE + HIELO \u2014 s/110.00';
  const newLabel = '(NUEVO) JAGERMEISTER COLD BREW COFFE + HIELO \u2014 s/119.00';

  // Find tokens in this batch with prizes matching the label
  const tokens = await prisma.token.findMany({
    where: { batchId },
    include: { prize: true },
  });

  const matching = tokens.filter(t => t.prize.label === oldLabel);
  console.log('Total tokens in batch:', tokens.length);
  console.log('Matching tokens (old label):', matching.length);

  if (matching.length > 0) {
    const prizeIds = [...new Set(matching.map(t => t.prizeId))];
    console.log('Prize IDs:', prizeIds);
    console.log('Prize label:', matching[0].prize.label);
    console.log('Prize key:', matching[0].prize.key);

    // Check if these prizes are used in OTHER batches
    for (const prizeId of prizeIds) {
      const usageInOtherBatches = await prisma.token.count({
        where: { prizeId, batchId: { not: batchId } },
      });
      console.log(`Prize ${prizeId} used in other batches: ${usageInOtherBatches} tokens`);
    }

    console.log('\nSample token IDs:');
    matching.slice(0, 5).forEach(t => console.log(' -', t.id));
  }

  // Show all unique prizes in this batch
  const prizes = [...new Map(tokens.map(t => [t.prizeId, t.prize])).values()];
  console.log('\nAll prizes in batch:');
  prizes.forEach(p => console.log(' -', p.label, '| id:', p.id));
}

main().catch(console.error).finally(() => prisma.$disconnect());
