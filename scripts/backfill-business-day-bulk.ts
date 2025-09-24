#!/usr/bin/env tsx
/**
 * Backfill BULK de businessDay usando una sola sentencia UPDATE en SQLite.
 * Mucho más rápido que el script incremental fila a fila.
 *
 * Fórmula replicando computeBusinessDayFromUtc (shift = cutoff + 5 horas):
 *   businessDay = substr(datetime(strftime('%s', scannedAt) - ( (cutoff + 5) * 3600 ), 'unixepoch'),1,10)
 *
 * Uso:
 *   npx tsx scripts/backfill-business-day-bulk.ts         (ejecuta)
 *   npx tsx scripts/backfill-business-day-bulk.ts --dry   (muestra preview COUNT sin modificar)
 */
import { PrismaClient } from '@prisma/client';
import { getConfiguredCutoffHour } from '../src/lib/attendanceDay';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const cutoff = getConfiguredCutoffHour();
  const shiftHours = cutoff + 5; // LIMA_TZ_OFFSET

  console.log(`[bulk-backfill] Iniciando. cutoff=${cutoff} shiftHours=${shiftHours} dry=${dry}`);

  const pending: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(1) as c FROM Scan WHERE businessDay IS NULL OR businessDay=''`);
  const pendingCount = Number(pending?.[0]?.c || 0);
  console.log(`[bulk-backfill] Pendientes=${pendingCount}`);
  if (pendingCount === 0) {
    console.log('[bulk-backfill] No hay filas a actualizar.');
    return;
  }
  if (dry) {
    console.log('[bulk-backfill] Dry-run: no se aplican cambios.');
    return;
  }

  const start = Date.now();
  const sql = `UPDATE Scan SET businessDay = substr(datetime(strftime('%s', scannedAt) - (${shiftHours} * 3600), 'unixepoch'),1,10) WHERE businessDay IS NULL OR businessDay=''`;
  const result = await prisma.$executeRawUnsafe(sql);
  const ms = Date.now() - start;
  console.log(`[bulk-backfill] Filas afectadas=${result} tiempoMs=${ms}`);

  const remain: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(1) as c FROM Scan WHERE businessDay IS NULL OR businessDay=''`);
  console.log(`[bulk-backfill] Restantes post-update=${remain?.[0]?.c}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error('[bulk-backfill] ERROR', e); process.exit(1); });
