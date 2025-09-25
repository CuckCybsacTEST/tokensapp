import { prisma } from '@/lib/prisma';
import { rangeFromPeriod } from '@/lib/date';

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : '1';
      out[key] = val;
      if (val !== '1') i++;
    }
  }
  return out as { name?: string; code?: string; id?: string; day?: string };
}

async function main() {
  const { name, code, id, day } = parseArgs();
  if (!name && !code && !id) {
    console.error('Usage: tsx scripts/deleteLastOut.ts --name "Full Name" [--day YYYY-MM-DD]');
    console.error('   or: tsx scripts/deleteLastOut.ts --code CODE [--day YYYY-MM-DD]');
    console.error('   or: tsx scripts/deleteLastOut.ts --id PERSON_ID [--day YYYY-MM-DD]');
    process.exit(1);
  }

  const { startDay } = rangeFromPeriod('today');
  const targetDay = day || startDay;

  const person = await prisma.person.findFirst({
    where: name
      ? { name }
      : code
      ? { code }
      : id
      ? { id }
      : undefined,
  });
  if (!person) {
    console.error('Person not found');
    process.exit(2);
  }

  const lastOut = await prisma.scan.findFirst({
    where: {
      personId: person.id,
      type: 'OUT',
      businessDay: targetDay,
    },
    orderBy: { scannedAt: 'desc' },
  });

  if (!lastOut) {
    console.log(`No OUT scan found for ${person.name} on ${targetDay}`);
    return;
  }

  console.log('Deleting OUT scan:', {
    id: lastOut.id,
    person: person.name,
    day: targetDay,
    scannedAt: lastOut.scannedAt.toISOString(),
  });
  await prisma.scan.delete({ where: { id: lastOut.id } });
  console.log('Deleted.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
