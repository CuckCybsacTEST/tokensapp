const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompletedTasks() {
  try {
    const startDate = new Date('2025-11-10T00:00:00.000Z');
    const endDate = new Date('2025-11-13T23:59:59.999Z');

    const completedTasks = await prisma.personTaskStatus.findMany({
      where: {
        done: true,
        updatedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        person: {
          select: { name: true, code: true, area: true }
        },
        task: {
          select: { label: true }
        }
      },
      orderBy: { updatedAt: 'asc' }
    });

    console.log(`Total de tareas completadas desde 10/11 hasta 13/11: ${completedTasks.length}`);

    completedTasks.forEach((record, index) => {
      const date = record.updatedAt.toISOString().split('T')[0];
      console.log(`${index + 1}. ${date} - ${record.person.name} (${record.person.area}): ${record.task.label}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompletedTasks();