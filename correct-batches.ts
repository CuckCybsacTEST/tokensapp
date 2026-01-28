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

async function correctBatch(batchId: string) {
  console.log(`🔧 Corrigiendo batch: ${batchId}`);

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
  const endTime = new Date(functionalDate.getTime() + (24 * 60 * 60 * 1000) + (3 * 60 * 60 * 1000)); // Día siguiente a las 3 AM
  const expiresAt = new Date(endTime.getTime()); // Expires al mismo tiempo que endTime

  console.log(`  📅 Functional Date: ${functionalDate.toISOString()}`);
  console.log(`  ⏰ Start Time: ${startTime.toISOString()}`);
  console.log(`  ⏰ End Time: ${endTime.toISOString()}`);
  console.log(`  ⏰ Expires At: ${expiresAt.toISOString()}`);

  // Actualizar tiempos
  const result = await prisma.token.updateMany({
    where: { batchId },
    data: {
      startTime,
      endTime,
      expiresAt
    }
  });

  console.log(`  ✅ Tokens actualizados: ${result.count}`);
}

async function main() {
  for (const batchId of batchIds) {
    await correctBatch(batchId);
  }
  console.log('🎉 Todos los batches corregidos');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });