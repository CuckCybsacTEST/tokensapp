const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const batchIds = [
    'cmkr68t4q00dh13emiyqb2pyw',
    'cmkr6g2e900e113emdf4v3tlp',
    'cmkr6nd0z00el13em2ekh7xpm',
    'cmkr9wjca00f913emtk4kwapq',
    'cmkrft9io00ga13em25mtf0vs',
    'cmkrgeavg00h013emdg3c6kxj',
    'cmkrgk3fc00hq13emvxpr0u3u',
    'cmkrgodkl00ig13em3f3gd3zn',
    'cmkrkec6f00k813emvkrmfnnl'
  ];

  const batches = await prisma.batch.findMany({
    where: {
      id: {
        in: batchIds
      }
    },
    select: {
      id: true,
      functionalDate: true
    }
  });

  console.log('Batches:');
  batches.forEach(batch => {
    console.log(`${batch.id}: ${batch.functionalDate}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });