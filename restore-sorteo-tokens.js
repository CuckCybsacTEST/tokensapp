// Script para restaurar fechas originales de tokens de sorteo
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Restaurando fechas originales de tokens de sorteo...');

  // Encontrar el batch de sorteo
  const sorteoBatch = await prisma.batch.findFirst({
    where: {
      description: {
        contains: 'TOKEN MANIA WEEKEND 01'
      }
    }
  });

  if (!sorteoBatch) {
    console.log('No se encontró el batch de sorteo');
    return;
  }

  console.log(`Batch encontrado: ${sorteoBatch.id} - ${sorteoBatch.description}`);
  console.log(`Fecha funcional del batch: ${sorteoBatch.functionalDate?.toISOString()}`);

  // Basado en la descripción "12.12.2025 al 14.12.2025", los tokens deberían expirar el 14 de diciembre
  const originalExpiryDate = new Date('2025-12-14T23:59:59.000Z'); // 14 de diciembre 2025 23:59:59 UTC

  console.log(`Restaurando tokens a fecha original: ${originalExpiryDate.toISOString()}`);

  // Actualizar tokens de este batch
  const updateResult = await prisma.token.updateMany({
    where: {
      batchId: sorteoBatch.id
    },
    data: {
      expiresAt: originalExpiryDate
    }
  });

  console.log(`✅ Restaurados ${updateResult.count} tokens`);

  // Verificar
  console.log('\n=== VERIFICACIÓN ===');
  const restoredTokens = await prisma.token.findMany({
    where: {
      batchId: sorteoBatch.id
    },
    select: {
      id: true,
      expiresAt: true
    },
    take: 5
  });

  console.log('Ejemplos de tokens restaurados:');
  restoredTokens.forEach(token => {
    console.log(`${token.id}: ${token.expiresAt.toISOString()}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());