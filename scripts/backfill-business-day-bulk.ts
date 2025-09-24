#!/usr/bin/env tsx
/**
 * LEGACY (SQLite only): Obsoleto tras migración a Postgres. Mantener solo como referencia.
 * No ejecutar en entornos Postgres; depende de funciones SQLite (strftime, substr, datetime).
 * Si se necesitara un backfill masivo en Postgres se implementaría vía:
 *   UPDATE "Scan" SET "businessDay" = to_char(("scannedAt" AT TIME ZONE 'UTC' - make_interval(hours => (cutoff+5)))::date, 'YYYY-MM-DD') WHERE ...
 *   (o computando en Node y batch-updating). No implementado porque la baseline ya trae businessDay completo.
 *
 */
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
  // Script sólo válido en SQLite. En Postgres saldrá error; evitamos ejecución accidental detectando provider (heurística simple).
  if (process.env.DATABASE_URL?.startsWith('postgres')) {
    console.error('[bulk-backfill] Abort: este script es solo para SQLite (legacy).');
    await prisma.$disconnect();
    return;
  }
  const sql = `UPDATE Scan SET businessDay = substr(datetime(strftime('%s', scannedAt) - (${shiftHours} * 3600), 'unixepoch'),1,10) WHERE businessDay IS NULL OR businessDay=''`;
  const result = await prisma.$executeRawUnsafe(sql);
  const ms = Date.now() - start;
  console.log(`[bulk-backfill] Filas afectadas=${result} tiempoMs=${ms}`);

  const remain: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(1) as c FROM Scan WHERE businessDay IS NULL OR businessDay=''`);
  console.log(`[bulk-backfill] Restantes post-update=${remain?.[0]?.c}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error('[bulk-backfill] ERROR', e); process.exit(1); });
