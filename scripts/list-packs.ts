import { PrismaClient } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  try {
    const packs = await prisma.birthdayPack.findMany({
      select: { name: true, qrCount: true, bottle: true, featured: true, perks: true, active: true },
      orderBy: { name: 'asc' }
    });
    console.log(packs);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
