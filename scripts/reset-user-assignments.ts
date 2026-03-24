/**
 * Reset all CommitmentAssignment records for a specific user (by DNI).
 * Usage: npx tsx scripts/reset-user-assignments.ts 43270293
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const targetDni = process.argv[2] || '43270293';

async function main() {
  // Find person by DNI (try exact match, then digits-only)
  const normalized = targetDni.replace(/\D+/g, '');
  let person = await prisma.person.findUnique({ where: { dni: normalized }, select: { id: true, name: true, dni: true, code: true } });
  if (!person) {
    person = await prisma.person.findUnique({ where: { dni: targetDni }, select: { id: true, name: true, dni: true, code: true } });
  }
  if (!person) {
    // Try searching by code
    person = await prisma.person.findUnique({ where: { code: normalized }, select: { id: true, name: true, dni: true, code: true } });
  }
  if (!person) {
    // Search by name substring
    const byName = await prisma.person.findMany({ where: { name: { contains: targetDni } }, select: { id: true, name: true, dni: true, code: true }, take: 5 });
    if (byName.length > 0) {
      console.log('Person not found by DNI, but found by name:', byName);
    } else {
      // List all persons to help debug
      const all = await prisma.person.findMany({ select: { name: true, dni: true, code: true }, take: 50 });
      console.log('Person not found. First 50 persons:');
      all.forEach(p => console.log(`  ${p.code} | ${p.dni} | ${p.name}`));
    }
    return;
  }

  console.log(`Person: ${person.name} (DNI: ${person.dni}, code: ${person.code})`);

  const user = await prisma.user.findFirst({ where: { personId: person.id }, select: { id: true, username: true } });
  if (!user) {
    console.log('No user account linked to this person.');
    return;
  }
  console.log(`User: ${user.username} (${user.id})`);

  // Show current assignments
  const assignments = await prisma.commitmentAssignment.findMany({
    where: { userId: user.id },
    include: { questionSet: { select: { name: true } } },
  });

  if (assignments.length === 0) {
    console.log('No assignments found for this user.');
    return;
  }

  console.log(`\nFound ${assignments.length} assignment(s):`);
  assignments.forEach(a => {
    console.log(`  • [${a.status}] ${a.questionSet.name} (completed: ${a.completedAt || 'never'})`);
  });

  // Reset all to PENDING
  const result = await prisma.commitmentAssignment.updateMany({
    where: { userId: user.id },
    data: { status: 'PENDING', completedAt: null },
  });

  console.log(`\n✅ Reset ${result.count} assignment(s) to PENDING for ${person.name}.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
