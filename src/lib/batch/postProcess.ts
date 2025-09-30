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
  await prisma.token.updateMany({ where: { batchId }, data: { expiresAt: end.toJSDate(), disabled: future } });
  await logEvent('BATCH_SINGLE_DAY_POST', 'post-proceso singleDay aplicado (helper)', { batchId, singleDayDate: start.toISO(), future });
  return { windowStart: start.toJSDate(), windowEnd: end.toJSDate(), future };
}

export async function applySingleHourWindow({ batchId, isoDate, hour, durationMinutes }: SingleHourWindowInput) {
  const base = DateTime.fromISO(isoDate, { zone: 'America/Lima' });
  if (!base.isValid) throw new Error('INVALID_DATE');
  const [hh, mm] = hour.split(':').map(Number);
  const jsBase = base.toJSDate();
  const start = new Date(jsBase.getTime());
  start.setHours(hh, mm, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const future = start.getTime() > Date.now();
  await prisma.token.updateMany({ where: { batchId }, data: { expiresAt: end, disabled: future } });
  try { await prisma.$executeRawUnsafe(`UPDATE "Token" SET "validFrom" = $1 WHERE "batchId" = $2`, start as any, batchId as any); } catch {}
  await logEvent('BATCH_SINGLE_HOUR_POST', 'post-proceso singleHour aplicado (helper)', { batchId, start: start.toISOString(), end: end.toISOString(), durationMinutes, future });
  return { windowStart: start, windowEnd: end, future };
}
