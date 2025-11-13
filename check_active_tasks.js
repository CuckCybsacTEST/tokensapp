const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasks() {
  try {
    const day = '2025-11-12';

    // Ver tareas activas para esa fecha
    const tasks = await prisma.task.findMany({
      where: {
        active: true,
        OR: [
          { area: null },
          { area: { not: null } }
        ],
        AND: [
          { OR: [{ startDay: null }, { startDay: { lte: day } }] },
          { OR: [{ endDay: null }, { endDay: { gte: day } }] }
        ]
      },
      select: {
        id: true,
        label: true,
        area: true,
        priority: true,
        measureEnabled: true,
        targetValue: true,
        unitLabel: true,
        startDay: true,
        endDay: true,
        active: true
      }
    });

    console.log('Tareas activas encontradas:', tasks.length);
    tasks.forEach(task => {
      console.log(`- ${task.label} (ID: ${task.id}) - Área: ${task.area} - Activa: ${task.active} - Fechas: ${task.startDay} a ${task.endDay}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasks();