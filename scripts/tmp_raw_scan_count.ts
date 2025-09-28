import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  try {
    const r:any = await p.$queryRawUnsafe(`SELECT COUNT(1) as c FROM "Scan"`);
    console.log('Raw count result', r);
  } catch (e) {
    console.error('Error raw count', e);
  } finally { await p.$disconnect(); }
})();
