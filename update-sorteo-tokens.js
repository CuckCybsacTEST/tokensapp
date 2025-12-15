// Script para actualizar fechas de tokens de sorteo al 22 de diciembre
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetDate = new Date('2025-12-22T23:59:59.000Z'); // 22 de diciembre 2025 23:59:59 UTC

  console.log('Identificando batches de sorteo (que no contienen "SHOW" en la descripción)...');

  // Encontrar batches que son sorteos (no shows)
  const sorteoBatches = await prisma.batch.findMany({
    where: {
      description: {
        not: {
          contains: 'SHOW'
        }
      }
    },
    select: {
      id: true,
      description: true,
      _count: {
        select: { tokens: true }
      }
    }
  });

  console.log('Batches identificados como sorteos:');
  sorteoBatches.forEach(batch => {
    console.log(`- ${batch.id}: ${batch.description} (${batch._count.tokens} tokens)`);
  });

  if (sorteoBatches.length === 0) {
    console.log('No se encontraron batches de sorteo. Revisando todos los batches...');

    const allBatches = await prisma.batch.findMany({
      select: {
        id: true,
        description: true,
        _count: {
          select: { tokens: true }
        }
      }
    });

    console.log('Todos los batches:');
    allBatches.forEach(batch => {
      console.log(`- ${batch.id}: ${batch.description} (${batch._count.tokens} tokens)`);
    });

    // Si no hay batches sin "SHOW", quizás actualizar todos
    console.log('\n¿Quieres actualizar todos los tokens? O especifica cuáles batches son sorteos.');
    return;
  }

  const batchIds = sorteoBatches.map(b => b.id);
  const totalTokens = sorteoBatches.reduce((sum, b) => sum + b._count.tokens, 0);

  console.log(`\nActualizando ${totalTokens} tokens de ${sorteoBatches.length} batches de sorteo...`);

  // Actualizar tokens de estos batches
  const updateResult = await prisma.token.updateMany({
    where: {
      batchId: {
        in: batchIds
      }
    },
    data: {
      expiresAt: targetDate
    }
  });

  console.log(`✅ Actualizados ${updateResult.count} tokens`);

  // Verificar
  console.log('\n=== VERIFICACIÓN ===');
  const updatedTokens = await prisma.token.findMany({
    where: {
      batchId: {
        in: batchIds
      }
    },
    select: {
      id: true,
      expiresAt: true,
      batch: {
        select: { description: true }
      }
    },
    take: 5
  });

  console.log('Ejemplos de tokens actualizados:');
  updatedTokens.forEach(token => {
    console.log(`${token.id}: ${token.expiresAt.toISOString()} - ${token.batch.description}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());