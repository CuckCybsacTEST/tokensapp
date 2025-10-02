// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const packs = await prisma.birthdayPack.findMany({ orderBy: { name: 'asc' } });
  const reservations = await prisma.birthdayReservation.count();
  console.log('\nBirthday packs:');
  for (const p of packs) {
    console.log(`- ${p.name} | qrCount=${p.qrCount} | priceSoles=${(p as any).priceSoles ?? 0} | bottle=${p.bottle} | active=${p.active}`);
  }
  console.log(`\nTotal reservations (sanity check, unchanged): ${reservations}`);
}

main().catch(e => { console.error(e); process.exit(1); });
