#!/usr/bin/env ts-node
/**
 * setFunctionalDate.ts
 * Uso: tsx scripts/setFunctionalDate.ts <batchId> <YYYY-MM-DD>
 * Ajusta Batch.functionalDate a la medianoche local Lima del día indicado (almacenado como 05:00 UTC).
 */
import { prisma } from '../src/lib/prisma';

function usage(msg?: string) {
  if (msg) console.error('Error:', msg);
  console.log('Uso: tsx scripts/setFunctionalDate.ts <batchId> <YYYY-MM-DD>');
  process.exit(msg ? 1 : 0);
}

function limaMidnightUtc(y:number,m:number,d:number){
  return new Date(Date.UTC(y,m-1,d,5,0,0,0));
}

async function main(){
  const args = process.argv.slice(2);
  // Soporta: tsx script.ts <batchId> <day>  (args length 2)
  // y npm run batch:set-date -- <batchId> <day> (args length 3 donde args[0] es 'scripts/setFunctionalDate.ts')
  let batchId: string | undefined;
  let day: string | undefined;
  if(args.length >= 2){
    const last2 = args.slice(-2);
    [batchId, day] = last2;
  }
  if(!batchId || !day) return usage('Parámetros insuficientes');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day.trim())) return usage('Formato de día inválido (YYYY-MM-DD)');
  const [Y,M,D] = day.split('-').map(Number);
  const fDate = limaMidnightUtc(Y,M,D);
  const anyPrisma = prisma as any;
  const existing = await anyPrisma.batch.findUnique({ where: { id: batchId } });
  if(!existing){
    console.error('Batch no encontrado:', batchId);
    process.exit(2);
  }
  await anyPrisma.batch.update({ where: { id: batchId }, data: { functionalDate: fDate } });
  console.log(`Batch ${batchId} actualizado functionalDate=${fDate.toISOString()}`);
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
