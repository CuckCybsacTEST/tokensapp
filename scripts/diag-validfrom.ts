import { PrismaClient } from '@prisma/client';

async function run() {
  const batchId = process.argv[2];
  const p = new PrismaClient();
  try {
    const cols: any = await p.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name='Token' ORDER BY column_name`);
    console.log('Token columns:', cols.map((c: any)=>c.column_name));
    if (batchId) {
  const logs: any = await p.$queryRawUnsafe(`SELECT type, substring(metadata,1,200) AS meta, "createdAt" FROM "EventLog" WHERE metadata LIKE $1 ORDER BY "createdAt" DESC LIMIT 12`, `%${batchId}%` as any);
  console.log('EventLog (batch related):');
  for (const l of logs) console.log(l.createdAt, l.type, l.meta);
  const sample: any = await p.$queryRawUnsafe(`SELECT id, "validFrom", "expiresAt", disabled FROM "Token" WHERE "batchId"=$1 LIMIT 3`, batchId as any);
  console.log('Sample tokens validFrom:', sample);
    }
  } catch (e:any) {
    console.error('diag error', e.message||e);
  } finally {
    await p.$disconnect();
  }
}
run();
