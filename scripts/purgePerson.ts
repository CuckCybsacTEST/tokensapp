async function loadPrisma() {
  const mod: any = await import('../src/lib/prisma.ts');
  // accommodate different module shapes
  if (mod?.prisma) return mod.prisma;
  if (mod?.default?.prisma) return mod.default.prisma;
  return mod.default || mod;
}

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
  return out as { name?: string; code?: string; id?: string; yes?: string };
}

async function main() {
  const prisma = await loadPrisma();
  const { name, code, id, yes } = parseArgs();
  if (!name && !code && !id) {
    console.error('Usage: tsx scripts/purgePerson.ts --code EMP-0003 [--yes]');
    console.error('    or: tsx scripts/purgePerson.ts --name "Full Name" [--yes]');
    console.error('    or: tsx scripts/purgePerson.ts --id PERSON_ID [--yes]');
    process.exit(1);
  }
  const person = await prisma.person.findFirst({
    where: name ? { name } : code ? { code } : id ? { id } : undefined,
  });
  if (!person) {
    console.error('Person not found');
    process.exit(2);
  }

  const scanCount = await prisma.scan.count({ where: { personId: person.id } });
  const ptsCount = await prisma.personTaskStatus.count({ where: { personId: person.id } });
  const user = await prisma.user.findFirst({ where: { personId: person.id } });

  console.log('About to purge person:', {
    person: { id: person.id, code: person.code, name: person.name },
    scans: scanCount,
    taskStatuses: ptsCount,
    hasUser: !!user,
  });

  if (!yes && process.env.CONFIRM !== 'YES') {
    console.error('Refusing to purge without --yes flag or CONFIRM=YES');
    process.exit(3);
  }

  // Delete in dependency order
  const delScans = await prisma.scan.deleteMany({ where: { personId: person.id } });
  const delPTS = await prisma.personTaskStatus.deleteMany({ where: { personId: person.id } });
  if (user) {
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.person.delete({ where: { id: person.id } });

  console.log('Purge complete:', {
    deletedScans: delScans.count,
    deletedTaskStatuses: delPTS.count,
    deletedUser: !!user,
    deletedPerson: true,
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const prisma = await loadPrisma();
      await prisma.$disconnect?.();
    } catch {}
  });
