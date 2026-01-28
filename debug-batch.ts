import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 INVESTIGANDO BATCH PROBLEMÁTICO');

  // Ver el batch completo
  const batch = await prisma.batch.findUnique({
    where: { id: 'cmkr5zs7900cv13emu6hmxfs5' },
    include: {
      tokens: {
        select: {
          id: true,
          createdAt: true,
          startTime: true,
          endTime: true,
          expiresAt: true,
          disabled: true,
          redeemedAt: true,
          ingestedAt: true
        }
      }
    }
  });

  if (!batch) {
    console.log('❌ Batch no encontrado');
    return;
  }

  console.log('📦 BATCH INFO:');
  console.log('  ID:', batch.id);
  console.log('  Created:', batch.createdAt);
  console.log('  Functional Date:', batch.functionalDate);
  console.log('  Description:', batch.description);

  const now = new Date();
  console.log('\n⏰ AHORA:', now.toISOString());

  // Analizar tokens
  console.log('\n🎫 ANÁLISIS DE TOKENS:');
  const disabledTokens = batch.tokens.filter(t => t.disabled);
  const enabledTokens = batch.tokens.filter(t => !t.disabled);
  const tokensWithTimes = batch.tokens.filter(t => t.startTime && t.endTime);

  console.log(`  Total tokens: ${batch.tokens.length}`);
  console.log(`  Tokens deshabilitados: ${disabledTokens.length}`);
  console.log(`  Tokens habilitados: ${enabledTokens.length}`);
  console.log(`  Tokens con tiempos definidos: ${tokensWithTimes.length}`);

  // Ver el primer token deshabilitado
  if (disabledTokens.length > 0) {
    const firstDisabled = disabledTokens[0];
    console.log('\n🚫 PRIMER TOKEN DESHABILITADO:');
    console.log('  ID:', firstDisabled.id);
    console.log('  Created:', firstDisabled.createdAt);
    console.log('  Ingested:', firstDisabled.ingestedAt);
    console.log('  Start Time:', firstDisabled.startTime);
    console.log('  End Time:', firstDisabled.endTime);
    console.log('  Expires:', firstDisabled.expiresAt);
    console.log('  Disabled:', firstDisabled.disabled);
  }

  // Buscar si hay algún proceso que deshabilita tokens
  console.log('\n🔍 BUSCANDO PATRONES...');

  // Ver si hay tokens de otros batches que sí están activos
  const otherActiveTokens = await prisma.token.findMany({
    where: {
      disabled: false,
      startTime: { lte: now },
      endTime: { gte: now }
    },
    select: { id: true, batchId: true, startTime: true, endTime: true },
    take: 3
  });

  console.log(`\n✅ TOKENS ACTIVOS DE OTROS BATCHES: ${otherActiveTokens.length}`);
  otherActiveTokens.forEach(t => {
    console.log(`  Batch ${t.batchId}: ${t.startTime} - ${t.endTime}`);
  });

  // Ver si hay algún log o proceso relacionado
  console.log('\n💡 POSIBLES CAUSAS:');
  console.log('  1. Los tokens se crearon deshabilitados por defecto');
  console.log('  2. Hay un proceso automático que los deshabilita');
  console.log('  3. Error en la configuración del batch');
  console.log('  4. Los tiempos no se configuraron correctamente');

  // Propuesta de solución
  console.log('\n🛠️ PROPUESTA DE SOLUCIÓN:');
  console.log('  Habilitar los tokens y configurar tiempos correctos');
}

main().catch(console.error).finally(() => prisma.$disconnect());
