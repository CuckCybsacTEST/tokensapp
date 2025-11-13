const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasksByDate(dateString) {
  try {
    const date = new Date(dateString + 'T00:00:00.000Z');
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Tareas activas en esa fecha
    const activeTasks = await prisma.task.findMany({
      where: {
        active: true,
        OR: [
          { startDay: null },
          { startDay: { lte: dateString } }
        ],
        AND: [
          { OR: [{ endDay: null }, { endDay: { gte: dateString } }] }
        ]
      },
      select: { id: true, label: true }
    });

    console.log(`Tareas activas el ${dateString}: ${activeTasks.length}`);

    // Status completados en esa fecha
    const completedStatuses = await prisma.personTaskStatus.findMany({
      where: {
        done: true,
        updatedAt: {
          gte: date,
          lt: nextDay
        }
      },
      include: {
        person: { select: { name: true, area: true } },
        task: { select: { label: true } }
      }
    });

    console.log(`Tareas completadas el ${dateString}: ${completedStatuses.length}`);
    completedStatuses.forEach((status, index) => {
      console.log(`  ${index + 1}. ${status.person.name} (${status.person.area}): ${status.task.label}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Verificar para cada fecha
const dates = ['2025-11-10', '2025-11-11', '2025-11-12', '2025-11-13'];
dates.forEach(date => checkTasksByDate(date));