const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const batches = await prisma.batch.findMany({
    where: {
      functionalDate: {
        gte: now
      }
    },
    orderBy: { functionalDate: 'asc' },
    select: {
      id: true,
      description: true,
      functionalDate: true,
      createdAt: true
    }
  });

  console.log('Batches with future functionalDate:');
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