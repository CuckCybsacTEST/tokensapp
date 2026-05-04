const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const token = await p.reusableToken.findFirst({
    where: { signature: { contains: '3B6B029844EA5987' } },
    select: { id: true, maxUses: true, usedCount: true, signature: true }
  });
  if (!token) {
    // Try by id pattern
    const all = await p.reusableToken.findMany({
      where: { id: { contains: '3B6B029844EA5987' } },
      select: { id: true, maxUses: true, usedCount: true, signature: true }
    });
    console.log('By id:', JSON.stringify(all, null, 2));
  } else {
    console.log('Found:', JSON.stringify(token, null, 2));
    await p.reusableToken.update({
      where: { id: token.id },
      data: { maxUses: 200 }
    });
    console.log('Updated maxUses to 200');
  }
  await p.$disconnect();
})();
