import { prisma } from '../src/lib/prisma';

async function main() {
  const confirmed = process.env.CONFIRM === 'YES';
  if (!confirmed) {
    console.log('Refusing to delete without CONFIRM=YES');
    console.log('Usage: CONFIRM=YES tsx scripts/clearTasks.ts');
    process.exit(1);
  }
  const statuses = await prisma.personTaskStatus.deleteMany({});
  const tasks = await prisma.task.deleteMany({});
  console.log(`Deleted ${statuses.count} PersonTaskStatus and ${tasks.count} Task rows.`);
}

main().catch((e)=>{ console.error(e); process.exit(1); }).finally(()=> prisma.$disconnect());
