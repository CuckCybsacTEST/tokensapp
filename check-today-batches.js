const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const batches = await prisma.batch.findMany({
    where: {
      createdAt: {
        gte: today
      }
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      description: true,
      functionalDate: true,
      createdAt: true
    }
  });

  console.log('Batches created today:');
  batches.forEach(batch => {
    console.log(`${batch.id}: ${batch.description} - ${batch.functionalDate} - ${batch.createdAt}`);
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