import { PrismaClient } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  try {
    const r = await prisma.$queryRaw`SELECT 1 as ok`;
    console.log('DB OK result:', r);
  } catch (e: any) {
    console.error('DB ERROR:', e.message, e.code || '');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
