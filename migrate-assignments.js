const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateAssignments() {
  try {
    // Get productions with old assignedToId
    const productions = await prisma.production.findMany({
      where: { assignedToId: { not: null } },
      select: { id: true, assignedToId: true }
    });

    console.log('Productions with old assignments:', productions.length);

    for (const prod of productions) {
      if (prod.assignedToId) {
        await prisma.productionAssignee.create({
          data: {
            productionId: prod.id,
            personId: prod.assignedToId
          }
        });
        console.log('Migrated:', prod.id, '->', prod.assignedToId);
      }
    }

    console.log('Migration completed');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAssignments();