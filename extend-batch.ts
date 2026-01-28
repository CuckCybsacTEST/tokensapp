import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const batchId = 'cmkr5zs7900cv13emu6hmxfs5';

  console.log('🔧 EXTENDIENDO TIEMPO DE ACTIVACIÓN DEL BATCH');

  // Extender hasta las 23:59 de hoy
  const now = new Date();
  const startTime = new Date(now.getTime() - (2 * 60 * 60 * 1000)); // 2 horas atrás para incluir ahora
  const endTime = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 horas adelante

  console.log('⏰ Nuevos tiempos:');
  console.log('  Start:', startTime.toISOString());
  console.log('  End:', endTime.toISOString());

  // Actualizar todos los tokens del batch
  const result = await prisma.token.updateMany({
    where: { batchId: batchId },
    data: {
      startTime: startTime,
      endTime: endTime
    }
  });

  console.log(`✅ Tokens actualizados: ${result.count}`);

  // Verificar
  const updatedTokens = await prisma.token.findMany({
    where: { batchId: batchId },
    select: { id: true, startTime: true, endTime: true, disabled: true },
    take: 3
  });

  console.log('\n🔍 VERIFICACIÓN:');
  const now2 = new Date();
  updatedTokens.forEach(token => {
    const isActive = token.startTime && token.endTime &&
                     !token.disabled &&
                     now2 >= token.startTime &&
                     now2 <= token.endTime;
    console.log(`  Token ${token.id}: ACTIVO=${isActive}`);
  });

  const activeCount = await prisma.token.count({
    where: {
      batchId: batchId,
      disabled: false,
      startTime: { lte: now2 },
      endTime: { gte: now2 }
    }
  });

  console.log(`\n🎯 TOTAL TOKENS ACTIVOS AHORA: ${activeCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
