const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. Check if there are any EventLog entries specifically about reusable tokens
  const rtLogs = await p.eventLog.findMany({
    where: {
      OR: [
        { type: { contains: 'reusable' } },
        { type: { contains: 'redeem' } },
        { type: { contains: 'token.redeem' } },
        { type: { contains: 'TOKEN' } },
        { type: { contains: 'scan' } },
      ]
    },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });
  console.log('=== EventLog with token/scan/redeem type ===');
  console.log(JSON.stringify(rtLogs.map(l => ({ type: l.type, msg: l.message?.slice(0,80), date: l.createdAt })), null, 2));

  // 2. Check all unique EventLog types
  const allTypes = await p.$queryRaw`SELECT DISTINCT type FROM "EventLog" ORDER BY type`;
  console.log('\n=== All unique EventLog types ===');
  console.log(JSON.stringify(allTypes, null, 2));

  // 3. Check if there's a way to see updatedAt on ReusableToken - the schema doesn't have updatedAt
  // but Prisma might track it. Let's check the raw DB
  const rawTokens = await p.$queryRaw`
    SELECT id, "usedCount", "redeemedAt", "deliveredAt", "createdAt" 
    FROM "ReusableToken" 
    WHERE "usedCount" > 0 
    ORDER BY "usedCount" DESC 
    LIMIT 15
  `;
  console.log('\n=== Raw reusable tokens with usedCount > 0 ===');
  console.log(JSON.stringify(rawTokens, null, 2));

  // 4. Any tables related to token scan with reusable token IDs? 
  // Check if the staff scanner logs anything
  const scannerLogs = await p.eventLog.findMany({
    where: { type: { startsWith: 'staff' } },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log('\n=== Staff scanner EventLogs ===');
  console.log(JSON.stringify(scannerLogs.map(l => ({ type: l.type, msg: l.message?.slice(0,80), date: l.createdAt })), null, 2));

  // 5. Check deliveredAt for tokens - might be usable as reference
  const deliveredTokens = await p.reusableToken.findMany({
    where: { deliveredAt: { not: null } },
    select: { id: true, usedCount: true, deliveredAt: true, createdAt: true },
    orderBy: { deliveredAt: 'desc' },
    take: 15
  });
  console.log('\n=== Tokens with deliveredAt ===');
  console.log(JSON.stringify(deliveredTokens, null, 2));

  await p.$disconnect();
}
main();
