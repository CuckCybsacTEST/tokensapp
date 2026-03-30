import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPrizes() {
  const prizes = await prisma.reusablePrize.findMany();
  console.log('Reusable prizes:', prizes.map(p => p.label));
}

checkPrizes().catch(console.error).finally(() => prisma.$disconnect());