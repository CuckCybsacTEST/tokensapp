#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const recent: any[] = await prisma.$queryRawUnsafe(`SELECT businessDay, COUNT(*) c FROM Scan GROUP BY 1 ORDER BY 1 DESC LIMIT 10`);
  console.log('Recent businessDay buckets:', recent);
  const pend: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(1) as c FROM Scan WHERE businessDay='' OR businessDay IS NULL`);
  console.log('Pending empty businessDay:', pend[0]?.c);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
