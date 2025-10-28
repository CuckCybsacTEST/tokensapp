import { DateTime } from 'luxon';
import { prisma } from '@/lib/prisma';
import { logEvent } from '@/lib/log';

export interface SingleDayWindowInput { batchId: string; isoDate: string; }
export interface SingleHourWindowInput { batchId: string; isoDate: string; hour: string; durationMinutes: number; }

export async function applySingleDayWindow({ batchId, isoDate }: SingleDayWindowInput) {
  const dt = DateTime.fromISO(isoDate, { zone: 'America/Lima' });
  if (!dt.isValid) throw new Error('INVALID_DATE');
  const start = dt.startOf('day');
  const end = dt.endOf('day');
  const future = start.toJSDate().getTime() > DateTime.now().setZone('America/Lima').startOf('day').toJSDate().getTime();
  
  // Check if this is a static batch - static tokens should not be disabled for future dates
  const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { staticTargetUrl: true, description: true } });
  const isStaticBatch = batch?.staticTargetUrl !== null && batch?.staticTargetUrl !== undefined;
  
  console.log(`[POST-PROCESS] applySingleDayWindow: batchId=${batchId}, future=${future}, isStaticBatch=${isStaticBatch}, staticTargetUrl="${batch?.staticTargetUrl}", description=${batch?.description}`);
  
  await prisma.token.updateMany({ where: { batchId }, data: { expiresAt: end.toJSDate(), disabled: future && !isStaticBatch } });
  await logEvent('BATCH_SINGLE_DAY_POST', 'post-proceso singleDay aplicado (helper)', { batchId, singleDayDate: start.toISO(), future, isStaticBatch });
  return { windowStart: start.toJSDate(), windowEnd: end.toJSDate(), future };
}

export async function applySingleHourWindow({ batchId, isoDate, hour, durationMinutes }: SingleHourWindowInput) {
  const base = DateTime.fromISO(isoDate, { zone: 'America/Lima' });
  if (!base.isValid) throw new Error('INVALID_DATE');
  const [hh, mm] = hour.split(':').map(Number);
  const start = base.set({ hour: hh, minute: mm, second: 0, millisecond: 0 });
  const end = start.plus({ minutes: durationMinutes });
  const future = start > DateTime.now().setZone('America/Lima');
  
  // Check if this is a static batch - static tokens should not be disabled for future dates
  const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { staticTargetUrl: true } });
  const isStaticBatch = batch?.staticTargetUrl !== null && batch?.staticTargetUrl !== undefined;
  
  console.log(`[POST-PROCESS] applySingleHourWindow: batchId=${batchId}, future=${future}, isStaticBatch=${isStaticBatch}, staticTargetUrl="${batch?.staticTargetUrl}"`);
  
  await prisma.token.updateMany({ where: { batchId }, data: { expiresAt: end.toJSDate(), disabled: future && !isStaticBatch } });
  try { await prisma.$executeRawUnsafe(`UPDATE "Token" SET "validFrom" = $1 WHERE "batchId" = $2`, start.toJSDate() as any, batchId as any); } catch {}
  await logEvent('BATCH_SINGLE_HOUR_POST', 'post-proceso singleHour aplicado (helper)', { batchId, start: start.toISO(), end: end.toISO(), durationMinutes, future, isStaticBatch });
  return { windowStart: start.toJSDate(), windowEnd: end.toJSDate(), future };
}
