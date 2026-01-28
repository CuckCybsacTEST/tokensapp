import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const batchIds = [
  'cmkr68t4q00dh13emiyqb2pyw',
  'cmkr6g2e900e113emdf4v3tlp',
  'cmkr6nd0z00el13em2ekh7xpm',
  'cmkr9wjca00f913emtk4kwapq',
  'cmkrft9io00ga13em25mtf0vs',
  'cmkrgeavg00h013emdg3c6kxj',
  'cmkrgk3fc00hq13emvxpr0u3u',
  'cmkrgodkl00ig13em3f3gd3zn',
  'cmkrkec6f00k813emvkrmfnnl'
];

async function activateBatch(batchId: string) {
  console.log(`🔧 Activando batch: ${batchId}`);

  // Obtener functionalDate del batch
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { functionalDate: true }
  });

  if (!batch || !batch.functionalDate) {
    console.log(`  ❌ Batch no encontrado o sin functionalDate`);
    return;
  }

  const functionalDate = new Date(batch.functionalDate);
  const startTime = functionalDate; // Inicio en el functionalDate
  const endTime = new Date(functionalDate.getTime() + (24 * 60 * 60 * 1000)); // 24 horas después

  console.log(`  📅 Functional Date: ${functionalDate.toISOString()}`);
  console.log(`  ⏰ Start Time: ${startTime.toISOString()}`);
  console.log(`  ⏰ End Time: ${endTime.toISOString()}`);

  // Habilitar tokens deshabilitados y setear tiempos
  const result = await prisma.token.updateMany({
    where: { batchId },
    data: {
      disabled: false,
      startTime,
      endTime
    }
  });

  console.log(`  ✅ Tokens actualizados: ${result.count}`);
}

async function main() {
  console.log('=== ACTIVANDO BATCHES AUTOMÁTICAMENTE ===\n');

  for (const batchId of batchIds) {
    await activateBatch(batchId);
    console.log('');
  }

  console.log('=== VERIFICACIÓN FINAL ===');
  // Verificar uno de ellos
  const checkBatch = await prisma.batch.findUnique({
    where: { id: batchIds[0] },
    select: {
      id: true,
      _count: { select: { tokens: true } }
    }
  });

  if (checkBatch) {
    const activeTokens = await prisma.token.count({
      where: {
        batchId: checkBatch.id,
        disabled: false,
        redeemedAt: null,
        startTime: { lte: new Date() },
        endTime: { gte: new Date() }
      }
    });

    console.log(`📦 Batch ${checkBatch.id}: ${activeTokens}/${checkBatch._count.tokens} tokens activos`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());