#!/usr/bin/env tsx
/**
 * Re-cálculo (recompute) de TODOS los Scan.businessDay usando un cutoff NUEVO.
 * Úsalo cuando cambias ATTENDANCE_CUTOFF_HOUR (ej: de 10 -> 14 para jornada discoteca 14:00-14:00).
 *
 * IMPORTANTE:
 *  - Este script SOBREESCRIBE el valor existente de businessDay para cada Scan que entre en el rango seleccionado.
 *  - Haz un backup antes (ej: export DB / snapshot) si estás en producción.
 *  - Puedes ejecutar en modo --dry para ver conteos sin escribir.
 *  - Puedes limitar por fecha de createdAt / scannedAt con --since YYYY-MM-DD y/o --until YYYY-MM-DD para reducir impacto.
 *  - Si necesitas auditoría histórica puedes primero exportar (SELECT id,businessDay FROM Scan) a un CSV antes de correrlo.
 *
 * Ejemplos:
 *   ATTENDANCE_CUTOFF_HOUR=14 npx tsx scripts/recompute-business-day.ts --dry
 *   ATTENDANCE_CUTOFF_HOUR=14 npx tsx scripts/recompute-business-day.ts --since 2025-08-01
 *   ATTENDANCE_CUTOFF_HOUR=14 npx tsx scripts/recompute-business-day.ts --since 2025-08-01 --until 2025-09-01
 *   ATTENDANCE_CUTOFF_HOUR=14 npx tsx scripts/recompute-business-day.ts --batch 2000
 */

import { PrismaClient } from '@prisma/client';
import { computeBusinessDayFromUtc, getConfiguredCutoffHour } from '../src/lib/attendanceDay';

const prisma = new PrismaClient();

interface Args {
  dryRun: boolean;
  since?: string; // YYYY-MM-DD inclusive
  until?: string; // YYYY-MM-DD inclusive
  batch: number;
  cutoff: number; // resolved
}

function parseArgs(): Args {
  const raw = process.argv.slice(2);
  const getVal = (flag: string) => {
    const idx = raw.indexOf(flag);
    return idx >= 0 ? raw[idx + 1] : undefined;
  };
  const dryRun = raw.includes('--dry');
  const since = getVal('--since');
  const until = getVal('--until');
  const batchStr = getVal('--batch');
  const batch = batchStr ? Math.max(50, parseInt(batchStr, 10)) : 1000;
  const overrideCutoffStr = getVal('--cutoff');
  const envCutoff = getConfiguredCutoffHour();
  const cutoff = overrideCutoffStr ? parseInt(overrideCutoffStr, 10) : envCutoff;
  if (Number.isNaN(cutoff) || cutoff < 0 || cutoff > 23) {
    throw new Error(`Cutoff inválido: ${cutoff}`);
  }
  if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error('--since formato YYYY-MM-DD');
  if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) throw new Error('--until formato YYYY-MM-DD');
  return { dryRun, since, until, batch, cutoff };
}

async function main() {
  const { dryRun, since, until, batch, cutoff } = parseArgs();
  console.log(`[recompute-business-day] Inicio cutoff=${cutoff} dryRun=${dryRun} batch=${batch} since=${since || '-'} until=${until || '-'} `);

  // Construimos condición WHERE opcional por rango de scannedAt.
  const whereParts: string[] = [];
  if (since) whereParts.push(`scannedAt >= '${since}T00:00:00.000Z'`);
  if (until) whereParts.push(`scannedAt <= '${until}T23:59:59.999Z'`);
  const whereClause = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '';

  // Conteo total a procesar
  const totalRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(1) as c FROM Scan ${whereClause}`);
  const total = Number(totalRes?.[0]?.c || 0);
  console.log(`[recompute-business-day] Total rows a evaluar: ${total}`);
  if (!total) {
    console.log('[recompute-business-day] Nada que hacer.');
    return;
  }

  let processed = 0;
  let updated = 0;
  let batchNum = 0;

  while (processed < total) {
    batchNum++;
    const rows: { id: string; scannedAt: Date }[] = await prisma.$queryRawUnsafe(
      `SELECT id, scannedAt FROM Scan ${whereClause} ORDER BY scannedAt ASC LIMIT ${batch} OFFSET ${processed}`
    );
    if (!rows.length) break; // terminado

    // Calculamos nuevo businessDay
    const updates = rows.map(r => ({ id: r.id, businessDay: computeBusinessDayFromUtc(r.scannedAt, cutoff) }));

    if (!dryRun) {
      // Usamos transaction + raw updates por eficiencia
      await prisma.$transaction(async (tx) => {
        for (const u of updates) {
          await tx.$executeRawUnsafe(`UPDATE Scan SET businessDay='${u.businessDay}' WHERE id='${u.id}'`);
        }
      });
    }

    processed += rows.length;
    updated += updates.length; // siempre coincidencia 1:1
    console.log(`[recompute-business-day] Lote ${batchNum} rows=${rows.length} acumulado=${processed}/${total}`);

    // Evitamos loops largos en dryRun
    if (dryRun) break;
  }

  console.log(`[recompute-business-day] FIN processed=${processed} updated=${dryRun ? 0 : updated} (dryRun=${dryRun})`);
  if (dryRun) console.log('[recompute-business-day] (dry) No se modificó la BD. Quita --dry para aplicar.');
}

main().catch(e => {
  console.error('[recompute-business-day] ERROR', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
