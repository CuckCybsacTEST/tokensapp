#!/usr/bin/env ts-node
/*
  Backfill script for Batch.functionalDate
  Strategy:
    1. Parse date from description using variants (DD.MM.YYYY, DD-MM-YYYY, DD/MM/YY, DDMMYYYY, etc.)
    2. If found, interpret as Lima local date at 00:00 -> store as UTC (add 5h) so that functionalDate UTC = local 00:00 +5h.
    3. Else derive from createdAt shifted to Lima (createdAt -5h) truncated to date.
 */
import { prisma } from '../src/lib/prisma';

function limaMidnightUtc(y:number,m:number,d:number){
  // store as UTC = local +5h
  return new Date(Date.UTC(y,m-1,d,5,0,0,0));
}

const datePatterns: RegExp[] = [
  /(\d{2})[.\/-](\d{2})[.\/-](\d{4})/,      // DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  /(\d{2})(\d{2})(\d{4})/,                   // DDMMYYYY
  /(\d{2})[.\/-](\d{2})[.\/-](\d{2})/       // DD.MM.YY
];

async function main(){
  const batches = await prisma.batch.findMany({ where: { functionalDate: null }, select: { id:true, description:true, createdAt:true } });
  let updated = 0, parsed = 0, derived = 0;
  for(const b of batches){
    let y:number|undefined,m:number|undefined,d:number|undefined;
    if(b.description){
      for(const rg of datePatterns){
        const mth = b.description.match(rg);
        if(mth){
          if(mth[0].length === 8 && /\d{8}/.test(mth[0])){ // DDMMYYYY
            d = parseInt(mth[1],10); m = parseInt(mth[2],10); y = parseInt(mth[3],10);
          } else if(mth[3] && mth[3].length === 2){ // YY
            d = parseInt(mth[1],10); m = parseInt(mth[2],10); y = 2000 + parseInt(mth[3],10);
          } else {
            d = parseInt(mth[1],10); m = parseInt(mth[2],10); y = parseInt(mth[3],10);
          }
          break;
        }
      }
    }
    let fDate: Date;
    if(y && m && d){
      parsed++;
      fDate = limaMidnightUtc(y,m,d);
    } else {
      // derive from createdAt -> shift to Lima
      const createdLocal = new Date(b.createdAt.getTime() - 5*3600*1000);
      y = createdLocal.getUTCFullYear(); m = createdLocal.getUTCMonth()+1; d = createdLocal.getUTCDate();
      fDate = limaMidnightUtc(y,m,d);
      derived++;
    }
    await prisma.batch.update({ where: { id: b.id }, data: { functionalDate: fDate } });
    updated++;
  }
  console.log(`Updated ${updated} batches. Parsed=${parsed} Derived=${derived}`);
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
