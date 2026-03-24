/**
 * Reset all CommitmentAssignment records for "CORTE SEMANAL" question sets
 * so they appear as unread/pending again.
 *
 * Usage: npx tsx scripts/reset-corte-semanal.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all question sets whose name contains "CORTE SEMANAL" (case-insensitive)
  const questionSets = await prisma.triviaQuestionSet.findMany({
    where: { name: { contains: 'CORTE SEMANAL' } },
    select: { id: true, name: true },
  });

  if (questionSets.length === 0) {
    console.log('No question sets found matching "CORTE SEMANAL".');
    // List all sets so the user can spot the right name
    const all = await prisma.triviaQuestionSet.findMany({ select: { id: true, name: true } });
    console.log('Available question sets:', all.map(s => `  • ${s.name} (${s.id})`).join('\n'));
    return;
  }

  console.log(`Found ${questionSets.length} question set(s):`);
  questionSets.forEach(s => console.log(`  • ${s.name} (${s.id})`));

  const qsIds = questionSets.map(s => s.id);

  // Count current assignments
  const totalBefore = await prisma.commitmentAssignment.count({
    where: { questionSetId: { in: qsIds } },
  });
  const completedBefore = await prisma.commitmentAssignment.count({
    where: { questionSetId: { in: qsIds }, status: 'COMPLETED' },
  });

  console.log(`\nAssignments: ${totalBefore} total, ${completedBefore} completed`);

  // Reset: set status back to PENDING and clear completedAt
  const result = await prisma.commitmentAssignment.updateMany({
    where: { questionSetId: { in: qsIds } },
    data: {
      status: 'PENDING',
      completedAt: null,
    },
  });

  console.log(`\n✅ Reset ${result.count} assignment(s) to PENDING.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
