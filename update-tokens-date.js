// Script para actualizar fechas de tokens al 22 de diciembre
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetDate = new Date('2025-12-22T23:59:59.000Z'); // 22 de diciembre 2025 23:59:59 UTC

  console.log('Actualizando todos los tokens para expirar el 22 de diciembre de 2025...');

  // Actualizar todos los tokens
  const updateResult = await prisma.token.updateMany({
    data: {
      expiresAt: targetDate
    }
  });

  console.log(`✅ Actualizados ${updateResult.count} tokens`);

  // También actualizar los functionalDate de los batches si es necesario
  console.log('Actualizando functionalDate de batches al 22 de diciembre...');

  const batchUpdateResult = await prisma.batch.updateMany({
    data: {
      functionalDate: new Date('2025-12-22T00:00:00.000Z') // Medianoche del 22
    }
  });

  console.log(`✅ Actualizados ${batchUpdateResult.count} batches`);

  // Verificar los cambios
  console.log('\n=== VERIFICACIÓN ===');
  const tokenCounts = await prisma.token.groupBy({
    by: ['expiresAt'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('Fechas de expiración después de la actualización:');
  tokenCounts.forEach(count => {
    console.log(`${count.expiresAt.toISOString().split('T')[0]}: ${count._count.id} tokens`);
  });

  const batches = await prisma.batch.findMany({
    select: {
      id: true,
      description: true,
      functionalDate: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('\nBatches actualizados:');
  batches.forEach(batch => {
    console.log(`${batch.id}: ${batch.functionalDate?.toISOString().split('T')[0]} - ${batch.description}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());