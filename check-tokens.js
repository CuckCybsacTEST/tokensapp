// Script para revisar tokens y batches
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BATCHES ===');
  const batches = await prisma.batch.findMany({
    select: {
      id: true,
      description: true,
      functionalDate: true,
      createdAt: true,
      _count: {
        select: { tokens: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  batches.forEach(batch => {
    console.log(`Batch ${batch.id}: ${batch.description || 'Sin descripción'}`);
    console.log(`  Fecha funcional: ${batch.functionalDate}`);
    console.log(`  Creado: ${batch.createdAt}`);
    console.log(`  Tokens: ${batch._count.tokens}`);
    console.log('');
  });

  console.log('=== TOKENS RECIENTES ===');
  const tokens = await prisma.token.findMany({
    select: {
      id: true,
      expiresAt: true,
      createdAt: true,
      batchId: true,
      prize: {
        select: { key: true, label: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  tokens.forEach(token => {
    console.log(`Token ${token.id}:`);
    console.log(`  Expira: ${token.expiresAt}`);
    console.log(`  Creado: ${token.createdAt}`);
    console.log(`  Batch: ${token.batchId}`);
    console.log(`  Premio: ${token.prize?.label || 'N/A'}`);
    console.log('');
  });

  // Contar tokens por fecha de expiración
  console.log('=== CONTEO DE TOKENS POR FECHA DE EXPIRACIÓN ===');
  const tokenCounts = await prisma.token.groupBy({
    by: ['expiresAt'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  tokenCounts.forEach(count => {
    console.log(`${count.expiresAt.toISOString().split('T')[0]}: ${count._count.id} tokens`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());