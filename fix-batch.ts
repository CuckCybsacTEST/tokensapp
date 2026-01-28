import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 CORRIGIENDO BATCH DE RULETA');

  const batchId = 'cmkr68t4q00dh13emiyqb2pyw';

  // Configurar tiempos de activación
  const startTime = new Date('2026-01-27T19:00:00.000Z'); // 19:00 Perú
  const endTime = new Date('2026-01-27T23:59:59.000Z');   // 23:59 Perú

  console.log('⏰ Configurando tiempos:');
  console.log('  Start:', startTime.toISOString());
  console.log('  End:', endTime.toISOString());

  // Actualizar todos los tokens del batch
  const result = await prisma.token.updateMany({
    where: {
      batchId: batchId,
      disabled: true // Solo los que están deshabilitados
    },
    data: {
      disabled: false, // Habilitar
      startTime: startTime,
      endTime: endTime
    }
  });

  console.log(`✅ Tokens actualizados: ${result.count}`);

  // Verificar el resultado
  const updatedTokens = await prisma.token.findMany({
    where: { batchId: batchId },
    select: {
      id: true,
      disabled: true,
      startTime: true,
      endTime: true
    },
    take: 3
  });

  console.log('\n🔍 VERIFICACIÓN:');
  updatedTokens.forEach(token => {
    console.log(`  Token ${token.id}:`);
    console.log(`    Disabled: ${token.disabled}`);
    console.log(`    Start: ${token.startTime}`);
    console.log(`    End: ${token.endTime}`);
  });

  const now = new Date();
  const activeTokens = await prisma.token.count({
    where: {
      batchId: batchId,
      disabled: false,
      startTime: { lte: now },
      endTime: { gte: now }
    }
  });

  console.log(`\n🎯 TOKENS ACTIVOS AHORA: ${activeTokens}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
