#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function checkBatches() {
  console.log('Checking all recent batches...');
  const batches = await prisma.batch.findMany({
    select: {
      id: true,
      description: true,
      staticTargetUrl: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  console.log(`Found ${batches.length} recent batches:`);
  batches.forEach(batch => {
    const isStatic = batch.staticTargetUrl !== null;
    console.log(`- ${batch.id}: ${batch.description} -> staticTargetUrl: "${batch.staticTargetUrl}" (isStatic: ${isStatic})`);
  });

  await prisma.$disconnect();
}

checkBatches().catch(console.error);