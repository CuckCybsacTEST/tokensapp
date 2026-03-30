import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function count() {
  const count = await prisma.reusableToken.count({
    where: {
      redeemedAt: {
        gte: new Date('2026-03-25T00:00:00.000Z'),
        lte: new Date('2026-03-25T23:59:59.999Z')
      }
    }
  });
  console.log('Count of redeemed reusable tokens on 2026-03-25:', count);
}

count().catch(console.error).finally(() => prisma.$disconnect());