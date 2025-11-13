const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasksAreas() {
  try {
    const tasks = await prisma.task.findMany({
      where: { active: true },
      select: { id: true, label: true, area: true }
    });

    console.log('Tareas activas y sus áreas:');
    tasks.forEach(task => {
      console.log(`${task.id}: ${task.label} - Área: ${task.area || 'Sin área'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasksAreas();