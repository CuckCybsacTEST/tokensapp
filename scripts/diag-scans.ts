// Use relative import to avoid TS path alias issues when running with plain node/tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  const total = await prisma.scan.count();
  console.log('Scan total =', total);
  const last = await prisma.scan.findMany({ orderBy: { scannedAt: 'desc' }, take: 20, select: { id: true, personId: true, type: true, scannedAt: true, businessDay: true } });
  console.log('Last scans:');
  for (const s of last) {
    console.log(`${s.scannedAt.toISOString()} BD=${s.businessDay} type=${s.type} person=${s.personId}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
