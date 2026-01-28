import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== CONSULTANDO BATCH DE RULETA ===');

  // Consultar el batch
  const batch = await prisma.batch.findUnique({
    where: { id: 'cmkr68t4q00dh13emiyqb2pyw' },
    include: {
      tokens: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          expiresAt: true,
          redeemedAt: true,
          disabled: true
        },
        take: 10 // Solo primeros 10 para ver
      }
    }
  });

  if (!batch) {
    console.log('❌ Batch no encontrado');
    return;
  }

  // Contar total de tokens en el batch
  const totalTokens = await prisma.token.count({
    where: { batchId: 'cmka50wnp004bjduyi2542nv6' }
  });

  console.log('📦 Batch ID:', batch.id);
  console.log('📅 Created At:', batch.createdAt);
  console.log('📅 Functional Date:', batch.functionalDate);
  console.log('🔄 Is Reusable:', batch.isReusable);
  console.log('🎯 Static Target URL:', batch.staticTargetUrl);
  console.log('🎫 Total Tokens:', totalTokens);

  const now = new Date();
  console.log('\n⏰ FECHA ACTUAL:', now.toISOString());

  // Analizar tokens
  console.log('\n🎫 PRIMEROS 10 TOKENS:');
  for (const token of batch.tokens) {
    console.log(`  Token ${token.id}:`);
    console.log(`    Start: ${token.startTime}`);
    console.log(`    End: ${token.endTime}`);
    console.log(`    Expires: ${token.expiresAt}`);
    console.log(`    Disabled: ${token.disabled}`);
    console.log(`    Redeemed: ${token.redeemedAt ? 'SÍ' : 'NO'}`);

    if (token.startTime && token.endTime) {
      const isActive = now >= token.startTime && now <= token.endTime;
      console.log(`    ✅ ACTIVO AHORA: ${isActive}`);
    }
    console.log('');
  }

  // Estadísticas generales
  const activeTokens = await prisma.token.count({
    where: {
      batchId: 'cmka50wnp004bjduyi2542nv6',
      disabled: false,
      redeemedAt: null,
      startTime: { lte: now },
      endTime: { gte: now }
    }
  });

  const disabledTokens = await prisma.token.count({
    where: { batchId: 'cmka50wnp004bjduyi2542nv6', disabled: true }
  });
  const redeemedTokens = await prisma.token.count({
    where: { batchId: 'cmka50wnp004bjduyi2542nv6', redeemedAt: { not: null } }
  });

  console.log('📊 ESTADÍSTICAS:');
  console.log(`  Total tokens: ${totalTokens}`);
  console.log(`  Tokens activos ahora: ${activeTokens}`);
  console.log(`  Tokens deshabilitados: ${disabledTokens}`);
  console.log(`  Tokens canjeados: ${redeemedTokens}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
