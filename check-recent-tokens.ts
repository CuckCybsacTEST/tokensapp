import { prisma } from './src/lib/prisma';

async function main() {
  const tokens = await prisma.token.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      expiresAt: true,
      createdAt: true,
      batchId: true
    }
  });

  console.log(JSON.stringify(tokens, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
