const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const tokens = await prisma.token.findMany({
    where: {
      startTime: null,
      batch: {
        createdAt: {
          gte: new Date('2026-01-20')
        }
      }
    },
    select: {
      id: true,
      batchId: true,
      disabled: true,
      startTime: true,
      endTime: true
    },
    take: 10
  });

  console.log('Tokens without startTime in recent batches:');
  tokens.forEach(token => {
    console.log(`${token.id} in batch ${token.batchId}: disabled=${token.disabled}, startTime=${token.startTime}, endTime=${token.endTime}`);
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