const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const batches = await prisma.batch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      description: true,
      functionalDate: true,
      createdAt: true
    }
  });

  console.log('Recent batches:');
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