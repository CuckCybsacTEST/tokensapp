import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  try {
    const c = await p.scan.count();
    console.log('Scan count =', c);
  } catch (e) {
    console.error('Error counting scans', e);
  } finally {
    await p.$disconnect();
  }
})();
