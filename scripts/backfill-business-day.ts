#!/usr/bin/env tsx
/**
 * Backfill de la columna businessDay en la tabla Scan.
 * (ver explicación completa en versión anterior del encabezado)
 */

import { PrismaClient } from '@prisma/client';
// Usamos import relativo porque este script vive fuera del include de tsconfig para alias '@/'
import { computeBusinessDayFromUtc, getConfiguredCutoffHour } from '../src/lib/attendanceDay';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  const cutoff = getConfiguredCutoffHour();
  const batchSize = 500;

  console.log(`[backfill-business-day] Inicio. cutoffHourLocal=${cutoff} dryRun=${dryRun}`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let batch = 0;

  while (true) {
    const rows: { id: string; scannedAt: Date }[] = await prisma.$queryRawUnsafe(
      `SELECT id, scannedAt FROM Scan WHERE (businessDay IS NULL OR businessDay = '') LIMIT ${batchSize}`
    );

    if (!rows.length) break; // Terminado

    batch++;
    const updates: { id: string; businessDay: string }[] = [];

    for (const r of rows) {
      const bd = computeBusinessDayFromUtc(r.scannedAt, cutoff);
      updates.push({ id: r.id, businessDay: bd });
    }

    if (!dryRun) {
      // Ejecutar dentro de una transacción para reducir overhead
      await prisma.$transaction(async (tx) => {
        for (const u of updates) {
          await tx.$executeRawUnsafe(
            `UPDATE Scan SET businessDay='${u.businessDay}' WHERE id='${u.id}'`
          );
        }
      });
    }

    totalProcessed += rows.length;
    totalUpdated += updates.length;
    console.log(`[backfill-business-day] Lote ${batch} procesado. rows=${rows.length} totalProcesado=${totalProcessed}`);

    // En modo dry-run no actualizamos la BD, por lo que obtendríamos el mismo lote infinitamente.
    // Cortamos después del primer lote para solo mostrar una muestra.
    if (dryRun) {
      console.log('[backfill-business-day] Dry-run: se detiene tras el primer lote para evitar loop infinito.');
      break;
    }
  }

  // Conteo de pendientes
  const remaining: any[] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(1) as c FROM Scan WHERE (businessDay IS NULL OR businessDay = '')`
  );
  const remainingCount = Number(remaining?.[0]?.c || 0);

  console.log(`[backfill-business-day] FIN. processed=${totalProcessed} updated=${dryRun ? 0 : totalUpdated} pendientes=${remainingCount}`);
  if (dryRun && totalProcessed > 0) {
    console.log(`[backfill-business-day] (dry) Nada se escribió. Ejecuta sin --dry para aplicar.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('[backfill-business-day] ERROR', e);
  process.exit(1);
});
