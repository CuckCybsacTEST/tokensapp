const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    const rows = await p.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='Person' ORDER BY 1");
    console.log(rows.map(r => r.column_name));
  } catch (e) {
    console.error('error inspecting columns', e);
  } finally {
    await p.$disconnect();
  }
})();
