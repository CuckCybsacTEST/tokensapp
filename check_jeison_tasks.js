const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificTasks() {
  try {
    const completed = await prisma.personTaskStatus.findMany({
      where: {
        done: true,
        updatedAt: {
          gte: new Date('2025-11-11T00:00:00.000Z'),
          lt: new Date('2025-11-12T00:00:00.000Z')
        },
        person: { name: 'Jeison Espinoza Mucha' }
      },
      include: {
        task: { select: { label: true, active: true, startDay: true, endDay: true } }
      }
    });

    console.log('Tareas completadas por Jeison el 11/11:');
    completed.forEach((status, index) => {
      console.log(`${index + 1}. ${status.task.label}`);
      console.log(`   Activa: ${status.task.active}`);
      console.log(`   startDay: ${status.task.startDay}`);
      console.log(`   endDay: ${status.task.endDay}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificTasks();