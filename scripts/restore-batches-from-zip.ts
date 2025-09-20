export {};
/* CLI: restaurar batches desde ZIPs exportados por /api/batch/:id/download */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { restoreFromZipBuffer } from '../src/server/restoreFromZip';

function isProdLike() {
  return process.env.NODE_ENV === 'production' || process.env.FORCE_PRISMA_PROD === '1';
}

async function promptConfirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(/^y(es)?$/i.test(ans.trim())); }));
}

async function main() {
  const dir = process.argv[2];
  const yes = process.argv.includes('--yes');
  if (!dir) {
    console.error('Uso: tsx scripts/restore-batches-from-zip.ts <carpeta_con_zips> [--yes]');
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    console.error(`No existe carpeta: ${abs}`);
    process.exit(1);
  }
  const zips = fs.readdirSync(abs).filter(f => f.toLowerCase().endsWith('.zip'));
  if (!zips.length) {
    console.error('No se encontraron archivos .zip en la carpeta');
    process.exit(1);
  }
  if (isProdLike() && !yes) {
    const ok = await promptConfirm('Estás en entorno de producción. ¿Restaurar desde ZIPs? (yes/NO): ');
    if (!ok) process.exit(1);
  }

  let totalCreated = 0, totalSkipped = 0, batches = 0;
  for (const name of zips) {
    const zipPath = path.join(abs, name);
    try {
      const buf = fs.readFileSync(zipPath);
      const res = await restoreFromZipBuffer(buf);
      console.log(`[ok] ${name} -> batch ${res.batchId}: tokens nuevos=${res.created}, ya existentes=${res.skipped}, prizes color actualizados=${res.updatedPrizeColors}`);
      totalCreated += res.created; totalSkipped += res.skipped; batches++;
    } catch (e: any) {
      console.warn(`[error] ${name}: ${e?.message || e}`);
    }
  }
  console.log(`\nResumen: batches procesados=${batches}, tokens insertados=${totalCreated}, tokens ya existentes=${totalSkipped}`);
}

main();
