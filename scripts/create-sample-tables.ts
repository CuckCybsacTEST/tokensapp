import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSampleTables() {
  try {
    console.log('Creando mesas de prueba...');

    // Crear mesas de diferentes zonas
    const tables = [
      { number: 1, name: 'Mesa 1', zone: 'Terraza', capacity: 4 },
      { number: 2, name: 'Mesa 2', zone: 'Terraza', capacity: 6 },
      { number: 3, name: 'Mesa 3', zone: 'Terraza', capacity: 2 },
      { number: 4, name: 'Mesa 4', zone: 'Interior', capacity: 4 },
      { number: 5, name: 'Mesa 5', zone: 'Interior', capacity: 6 },
      { number: 6, name: 'Mesa 6', zone: 'VIP', capacity: 8 },
      { number: 7, name: 'Mesa 7', zone: 'Bar', capacity: 2 },
      { number: 8, name: 'Mesa 8', zone: 'Bar', capacity: 4 },
    ];

    for (const tableData of tables) {
      await prisma.table.upsert({
        where: { number: tableData.number },
        update: { active: true },
        create: {
          ...tableData,
          active: true,
        },
      });
    }

    console.log('Mesas creadas exitosamente!');
  } catch (error) {
    console.error('Error creando mesas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleTables();