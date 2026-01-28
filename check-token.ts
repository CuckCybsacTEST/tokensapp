import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tokenId = '5a706fe1-d57c-4132-8995-36a4aa3cde20';

  console.log('🔍 INVESTIGANDO TOKEN ESPECÍFICO');

  // Buscar el token
  const token = await prisma.token.findUnique({
    where: { id: tokenId },
    include: {
      batch: {
        include: {
          tokens: {
            select: {
              id: true,
              prizeId: true,
              disabled: true,
              startTime: true,
              endTime: true
            }
          }
        }
      },
      prize: true
    }
  });

  if (!token) {
    console.log('❌ Token no encontrado');
    return;
  }

  console.log('🎫 TOKEN INFO:');
  console.log('  ID:', token.id);
  console.log('  Batch ID:', token.batchId);
  console.log('  Prize:', token.prize?.label);
  console.log('  Disabled:', token.disabled);
  console.log('  Start Time:', token.startTime);
  console.log('  End Time:', token.endTime);
  console.log('  Expires At:', token.expiresAt);

  console.log('\n📦 BATCH INFO:');
  console.log('  ID:', token.batch.id);
  console.log('  Description:', token.batch.description);
  console.log('  Created:', token.batch.createdAt);
  console.log('  Functional Date:', token.batch.functionalDate);
  console.log('  Is Reusable:', token.batch.isReusable);

  const now = new Date();
  console.log('\n⏰ FECHA ACTUAL:', now.toISOString());

  // Verificar si está activo
  const isActive = token.startTime && token.endTime &&
                   !token.disabled &&
                   now >= token.startTime &&
                   now <= token.endTime;

  console.log('\n✅ ¿ESTÁ ACTIVO?', isActive);

  if (token.startTime) {
    console.log('  Start Time:', token.startTime.toISOString());
    console.log('  now >= startTime:', now >= token.startTime);
  }

  if (token.endTime) {
    console.log('  End Time:', token.endTime.toISOString());
    console.log('  now <= endTime:', now <= token.endTime);
  }

  // Contar premios únicos en el batch
  const uniquePrizes = new Set(token.batch.tokens.map(t => t.prizeId));
  console.log('\n🏆 PREMIOS EN EL BATCH:');
  console.log('  Total tokens:', token.batch.tokens.length);
  console.log('  Premios únicos:', uniquePrizes.size);

  // Listar premios
  const prizes = await prisma.prize.findMany({
    where: {
      id: { in: Array.from(uniquePrizes) }
    },
    select: {
      id: true,
      label: true,
      color: true
    }
  });

  console.log('  Lista de premios:');
  prizes.forEach(prize => {
    console.log(`    - ${prize.label} (${prize.color})`);
  });

  // Verificar tokens activos en el batch
  const activeTokens = token.batch.tokens.filter(t =>
    t.startTime && t.endTime &&
    !t.disabled &&
    now >= t.startTime &&
    now <= t.endTime
  );

  console.log('\n🎯 TOKENS ACTIVOS EN BATCH:', activeTokens.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
