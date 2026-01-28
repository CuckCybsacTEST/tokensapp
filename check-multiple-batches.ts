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

async function checkBatch(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      createdAt: true,
      functionalDate: true,
      isReusable: true,
      staticTargetUrl: true,
      _count: {
        select: { tokens: true }
      }
    }
  });

  if (!batch) {
    return { id: batchId, exists: false };
  }

  const totalTokens = batch._count.tokens;
  const disabledTokens = await prisma.token.count({
    where: { batchId, disabled: true }
  });
  const activeTokens = await prisma.token.count({
    where: {
      batchId,
      disabled: false,
      redeemedAt: null,
      startTime: { lte: new Date() },
      endTime: { gte: new Date() }
    }
  });

  return {
    id: batchId,
    exists: true,
    createdAt: batch.createdAt,
    functionalDate: batch.functionalDate,
    totalTokens,
    disabledTokens,
    activeTokens,
    hasProblem: disabledTokens === totalTokens && totalTokens > 0
  };
}

async function main() {
  console.log('=== REVISIÓN DE BATCHES ===\n');

  for (const batchId of batchIds) {
    const result = await checkBatch(batchId);
    console.log(`📦 Batch: ${result.id}`);
    if (!result.exists) {
      console.log('  ❌ No existe');
    } else {
      console.log(`  📅 Creado: ${result.createdAt?.toISOString()}`);
      console.log(`  📅 Funcional: ${result.functionalDate?.toISOString()}`);
      console.log(`  🎫 Total tokens: ${result.totalTokens}`);
      console.log(`  🚫 Deshabilitados: ${result.disabledTokens}`);
      console.log(`  ✅ Activos ahora: ${result.activeTokens}`);
      console.log(`  ⚠️  Problema: ${result.hasProblem ? 'SÍ' : 'NO'}`);
    }
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());