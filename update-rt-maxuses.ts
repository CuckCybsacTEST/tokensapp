import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.reusableToken.update({
    where: { id: 'rt_3B6B029844EA5987' },
    data: { maxUses: 1000 },
    include: { prize: true },
  });
  console.log('Updated:', { id: t.id, prize: t.prize.label, maxUses: t.maxUses, usedCount: t.usedCount });
}

main().catch(console.error).finally(() => prisma.$disconnect());
