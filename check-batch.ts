import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const batch = await prisma.reusableTokenBatch.findUnique({
    where: { id: 'cmkr5zs7900cv13emu6hmxfs5' },
    include: {
      tokens: { take: 3 },
      prize: true
    }
  });
  
  if (!batch) {
    console.log('Batch no encontrado');
    return;
  }
  
  console.log('=== BATCH INFO ===');
  console.log('ID:', batch.id);
  console.log('Name:', batch.name);
  console.log('Active:', batch.active);
  console.log('Scheduled:', batch.scheduled);
  console.log('StartTime:', batch.startTime);
  console.log('EndTime:', batch.endTime);
  console.log('Prize:', batch.prize?.name);
  console.log('Tokens count:', batch.tokens.length);
  
  const now = new Date();
  console.log('\n=== FECHA ACTUAL ===');
  console.log('Now (UTC):', now.toISOString());
  
  if (batch.startTime) {
    console.log('\n=== COMPARACIÓN ===');
    console.log('StartTime (UTC):', batch.startTime.toISOString());
    console.log('now >= startTime:', now >= batch.startTime);
  }
  
  if (batch.endTime) {
    console.log('EndTime (UTC):', batch.endTime.toISOString());
    console.log('now <= endTime:', now <= batch.endTime);
  }
  
  // Verificar tokens
  if (batch.tokens.length > 0) {
    console.log('\n=== TOKENS ===');
    for (const token of batch.tokens) {
      console.log('Token ID:', token.id);
      console.log('  startTime:', token.startTime?.toISOString());
      console.log('  endTime:', token.endTime?.toISOString());
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
