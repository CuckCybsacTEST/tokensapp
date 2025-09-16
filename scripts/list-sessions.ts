import { prisma } from '../src/lib/prisma';
(async ()=>{
  const sessions = await (prisma as any).rouletteSession.findMany({ orderBy:{ createdAt:'desc'}, take:5});
  console.log(JSON.stringify(sessions.map((s:any)=>({id:s.id, mode:s.mode, status:s.status, spins:s.spins, maxSpins:s.maxSpins})), null, 2));
  process.exit(0);
})();
