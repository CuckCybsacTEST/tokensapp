const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const id = process.argv[2];
if (!id) {
  console.error('Uso: node scripts/lookup-token.js <tokenId>');
  process.exit(1);
}

(async () => {
  try {
    console.log('--- Lookup Token Debug ---');
    const dbHost = (process.env.DATABASE_URL || '').split('@').pop()?.split('/')[0];
    console.log('DB Host:', dbHost);
    console.log('Input ID:', id);

    const token = await prisma.token.findUnique({ where: { id } });
    console.log('Token findUnique result:', token);

    const invite = await prisma.inviteToken.findUnique({ where: { code: id } });
    console.log('InviteToken findUnique result:', invite);

    const prefix = id.slice(0, 8);
    const starts = await prisma.token.findMany({
      where: { id: { startsWith: prefix } },
      take: 5,
      select: { id: true, prizeId: true, batchId: true, createdAt: true }
    });
    console.log(`Tokens starting with '${prefix}':`, starts);

    const total = await prisma.token.count();
    console.log('Total tokens count:', total);
  } catch (e) {
    console.error('Error during lookup:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
