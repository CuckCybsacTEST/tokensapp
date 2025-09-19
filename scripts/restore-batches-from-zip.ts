export {};
/*
  Restaura batches desde ZIPs exportados por /api/batch/:id/download.
  - Crea/asegura Batch (id, createdAt, description)
  - Asegura Prize (id, key, label, color)
  - Inserta Tokens (id, prizeId, batchId, expiresAt, redeemedAt?, signature, signatureVersion=1, disabled)
  Notas:
  - Se requiere que TOKEN_SECRET sea el mismo que se usó para firmar originalmente los tokens para que la verificación de firma funcione al canjear.
  - Campos de 2 fases (revealedAt, deliveredAt, assignedPrizeId) no están en tokens.csv del ZIP; no se pueden reconstruir.
*/
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import JSZip from 'jszip';

// PrismaClient carga en tiempo de ejecución
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client') as { PrismaClient: any };
const prisma = new PrismaClient();

type Manifest = {
  batchId: string;
  createdAt: string;
  description: string | null;
  prizes: Array<{ prizeId: string; prizeKey: string; prizeLabel: string; count: number }>;
};

type TokenCsv = {
  token_id: string;
  batch_id: string;
  prize_id: string;
  prize_key: string;
  prize_label: string;
  prize_color: string;
  expires_at_iso: string;
  expires_at_unix: string;
  signature: string;
  redeem_url: string;
  redeemed_at: string;
  disabled: string;
};

function isProdLike() {
  return process.env.NODE_ENV === 'production' || process.env.FORCE_PRISMA_PROD === '1';
}

async function promptConfirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(/^y(es)?$/i.test(ans.trim())); }));
}

function parseCsv(text: string): TokenCsv[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]);
  const idx: Record<string, number> = {};
  header.forEach((h, i) => idx[h] = i);
  const out: TokenCsv[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (!cols.length) continue;
    const obj: any = {};
    for (const k of Object.keys(idx)) obj[k] = cols[idx[k]] ?? '';
    out.push(obj as TokenCsv);
  }
  return out;
}

function parseCsvLine(line: string): string[] {
  const res: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = false; }
      } else cur += ch;
    } else {
      if (ch === ',') { res.push(cur); cur = ''; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  res.push(cur);
  return res;
}

async function restoreFromZip(zipPath: string) {
  const buf = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(new Uint8Array(buf));
  const manifestEntry = zip.file('manifest.json');
  const tokensEntry = zip.file('tokens.csv');
  if (!manifestEntry || !tokensEntry) throw new Error('ZIP inválido: faltan manifest.json o tokens.csv');
  const manifest: Manifest = JSON.parse(await manifestEntry.async('string'));
  const tokensCsv = await tokensEntry.async('string');
  const tokens = parseCsv(tokensCsv);

  // Upsert Batch
  const batchId = manifest.batchId;
  const createdAt = new Date(manifest.createdAt);
  await prisma.batch.upsert({
    where: { id: batchId },
    update: { description: manifest.description ?? undefined },
    create: { id: batchId, description: manifest.description, createdAt },
  });

  // Asegurar Prizes por manifest (id/key/label)
  for (const p of manifest.prizes) {
    const existing = await prisma.prize.findUnique({ where: { id: p.prizeId } }).catch(() => null);
    if (!existing) {
      // color no viene aquí; tokens.csv sí lo trae fila a fila; tomaremos el primero luego si hace falta
      try {
        await prisma.prize.create({ data: { id: p.prizeId, key: p.prizeKey, label: p.prizeLabel } });
      } catch (e: any) {
        // Si hay conflicto de clave única en 'key', generamos una clave alternativa manteniendo el id original
        const altKey = `${p.prizeKey}-restored-${p.prizeId.slice(0,6)}`;
        await prisma.prize.create({ data: { id: p.prizeId, key: altKey, label: p.prizeLabel } });
      }
    }
  }

  // Insertar tokens (saltando si existen)
  let created = 0, skipped = 0, updatedPrizeColors = 0;
  const colorByPrize: Record<string, string | undefined> = {};
  for (const row of tokens) {
    const prizeId = row.prize_id;
    if (colorByPrize[prizeId] === undefined) colorByPrize[prizeId] = row.prize_color || undefined;

    const tokenId = row.token_id;
    const expiresAt = new Date(row.expires_at_iso);
    const redeemedAt = row.redeemed_at ? new Date(row.redeemed_at) : null;
    const disabled = /^true|1$/i.test(row.disabled);
    const signature = row.signature;

    try {
      await prisma.token.create({
        data: {
          id: tokenId,
          batchId: row.batch_id,
          prizeId,
          expiresAt,
          createdAt: createdAt, // aproximamos al createdAt del batch
          redeemedAt: redeemedAt || undefined,
          disabled,
          signature,
          signatureVersion: 1,
        },
      });
      created++;
    } catch (e: any) {
      // Probablemente ya existe: omitir
      skipped++;
    }
  }

  // Completar color de Prize si está vacío
  for (const [pid, color] of Object.entries(colorByPrize)) {
    if (!color) continue;
    const p = await prisma.prize.findUnique({ where: { id: pid } });
    if (p && !p.color) {
      await prisma.prize.update({ where: { id: pid }, data: { color } });
      updatedPrizeColors++;
    }
  }

  // Alinear métricas de Prize para que aparezcan como "Emitidos":
  // - stock = 0 (no hay pendientes tras restauración)
  // - emittedTotal = total de tokens existentes para ese premio (idempotente)
  // - lastEmittedAt = max(actual, createdAt del batch)
  for (const p of manifest.prizes) {
    const prize = await prisma.prize.findUnique({ where: { id: p.prizeId } });
    if (!prize) continue;
    const totalForPrize: number = await prisma.token.count({ where: { prizeId: p.prizeId } });
    const newLast = prize.lastEmittedAt && prize.lastEmittedAt > createdAt ? prize.lastEmittedAt : createdAt;
    await prisma.prize.update({
      where: { id: p.prizeId },
      data: {
        stock: 0,
        emittedTotal: totalForPrize,
        lastEmittedAt: newLast,
      },
    });
  }

  return { batchId, created, skipped, updatedPrizeColors };
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
      const res = await restoreFromZip(zipPath);
      console.log(`[ok] ${name} -> batch ${res.batchId}: tokens nuevos=${res.created}, ya existentes=${res.skipped}, prizes color actualizados=${res.updatedPrizeColors}`);
      totalCreated += res.created; totalSkipped += res.skipped; batches++;
    } catch (e: any) {
      console.warn(`[error] ${name}: ${e?.message || e}`);
    }
  }
  console.log(`\nResumen: batches procesados=${batches}, tokens insertados=${totalCreated}, tokens ya existentes=${totalSkipped}`);
}

main().finally(() => prisma.$disconnect());
