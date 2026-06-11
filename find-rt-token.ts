import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Try exact ID
  const t = await prisma.reusableToken.findUnique({
    where: { id: 'rt_3B6B029844EA5987' },
    include: { prize: true },
  });
  if (t) {
    console.log('Found:', { id: t.id, maxUses: t.maxUses, usedCount: t.usedCount, prize: t.prize.label });
    return;
  }

  // Try signature search
  const bySig = await prisma.reusableToken.findFirst({
    where: { signature: { contains: '3B6B029844EA5987' } },
    include: { prize: true },
  });
  if (bySig) {
    console.log('Found by signature:', { id: bySig.id, maxUses: bySig.maxUses, usedCount: bySig.usedCount, prize: bySig.prize.label });
    return;
  }

  // List tokens with maxUses=400 and usedCount=400
  const exhausted = await prisma.reusableToken.findMany({
    where: { maxUses: 400, usedCount: 400 },
    include: { prize: true },
  });
  console.log('Tokens with 400/400:', exhausted.length);
  exhausted.forEach(t => console.log(' -', t.id, '|', t.prize.label, '| maxUses:', t.maxUses, '| usedCount:', t.usedCount));
}

main().catch(console.error).finally(() => prisma.$disconnect());
