/*
  Interactive backup for Batches.
  - Lists recent batches with token counts
  - Lets you choose which to back up (indices/ids/latest N/all)
  - Exports JSON manifest + tokens.csv per batch into backups/ and a ZIP per batch
*/
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import archiver from 'archiver';

// Ensure DATABASE_URL for Prisma (fallback to local dev DB)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
  console.log('DATABASE_URL not set; using fallback file:./prisma/dev.db');
}

// Prefer standard import; fallback require if needed in some setups
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client') as { PrismaClient: any };
const prisma = new PrismaClient();

type BatchRow = {
  id: string;
  description: string | null;
  createdAt: Date;
  _count: { tokens: number };
};

type TokenRow = {
  id: string;
  prizeId: string;
  expiresAt: Date;
  createdAt: Date;
  redeemedAt: Date | null;
  revealedAt: Date | null;
  deliveredAt: Date | null;
  disabled: boolean;
  signature: string;
  signatureVersion: number | null;
  prize: { id: string; key: string; label: string; color: string | null } | null;
};

function fmt(d: Date) {
  // yyyy-mm-dd hh:mm
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

async function listBatches(limit = 30): Promise<BatchRow[]> {
  const rows = await prisma.batch.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      description: true,
      createdAt: true,
      _count: { select: { tokens: true } },
    },
  });
  return rows as BatchRow[];
}

function printTable(rows: BatchRow[]) {
  console.log('\nBatches recientes:');
  console.log('Idx  | Created At        | Tokens | Description');
  console.log('-----+-------------------+--------+-----------------------------');
  rows.forEach((r, i) => {
    const idx = String(i + 1).padStart(3, ' ');
    const when = fmt(new Date(r.createdAt));
    const cnt = String(r._count.tokens).padStart(6, ' ');
    const desc = (r.description || '').slice(0, 40);
    console.log(`${idx} | ${when} | ${cnt} | ${desc}`);
  });
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

async function exportBatch(batchId: string, baseDir: string) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    console.warn(`[skip] batch ${batchId} not found`);
    return;
  }
  const tokens: TokenRow[] = await prisma.token.findMany({
    where: { batchId },
    select: {
      id: true,
      prizeId: true,
      expiresAt: true,
      createdAt: true,
      redeemedAt: true,
      revealedAt: true,
      deliveredAt: true,
      disabled: true,
      signature: true,
      signatureVersion: true,
      prize: { select: { id: true, key: true, label: true, color: true } },
    },
  });

  const folder = path.join(baseDir, `batch_${batch.id}`);
  fs.mkdirSync(folder, { recursive: true });

  // Write tokens.csv
  const header = [
    'token_id', 'prize_id', 'prize_key', 'prize_label', 'prize_color',
    'expires_at_iso', 'redeemed_at_iso', 'revealed_at_iso', 'delivered_at_iso',
    'disabled', 'signature', 'signature_version'
  ];
  const lines = [header.join(',')];
  for (const t of tokens) {
    const row = [
      t.id,
      t.prizeId,
      t.prize?.key ?? '',
      (t.prize?.label ?? '').replace(/[,\n\r]/g, ' '),
      t.prize?.color ?? '',
      new Date(t.expiresAt).toISOString(),
      t.redeemedAt ? new Date(t.redeemedAt).toISOString() : '',
      t.revealedAt ? new Date(t.revealedAt).toISOString() : '',
      t.deliveredAt ? new Date(t.deliveredAt).toISOString() : '',
      t.disabled ? '1' : '0',
      t.signature,
      String(t.signatureVersion ?? ''),
    ];
    lines.push(row.map((s) => String(s)).join(','));
  }
  fs.writeFileSync(path.join(folder, 'tokens.csv'), lines.join('\n'), 'utf8');

  // Write manifest.json
  const manifest = {
    id: batch.id,
    description: batch.description,
    createdAt: batch.createdAt,
    totals: {
      totalTokens: tokens.length,
      redeemed: tokens.filter((t: TokenRow) => !!t.redeemedAt).length,
      delivered: tokens.filter((t: TokenRow) => !!t.deliveredAt).length,
      revealed: tokens.filter((t: TokenRow) => !!t.revealedAt).length,
      disabled: tokens.filter((t: TokenRow) => !!t.disabled).length,
    },
  };
  fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // Also write batch.json minimal
  fs.writeFileSync(path.join(folder, 'batch.json'), JSON.stringify(batch, null, 2), 'utf8');

  // Zip folder
  const zipPath = path.join(baseDir, `batch_${batch.id}.zip`);
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(folder, false);
    archive.finalize().catch(reject);
  });
  console.log(`[ok] Backup escrito: ${zipPath}`);
}

async function main() {
  const baseDir = path.resolve(process.cwd(), 'backups');
  fs.mkdirSync(baseDir, { recursive: true });

  const rows = await listBatches(50);
  if (!rows.length) {
    console.log('No hay batches.');
    return;
  }
  printTable(rows);

  const ans = (await prompt('\nElige batches a respaldar (ej: 1,3,5 o ids; "latest 3"; "all"): ')).trim();
  let selected: string[] = [];
  if (!ans) {
    console.log('Nada seleccionado. Saliendo.');
    return;
  }
  if (/^all$/i.test(ans)) {
    selected = rows.map((r) => r.id);
  } else if (/^latest\s+(\d{1,3})$/i.test(ans)) {
    const m = ans.match(/^latest\s+(\d{1,3})$/i)!;
    const n = Math.min(rows.length, Math.max(1, parseInt(m[1], 10)));
    selected = rows.slice(0, n).map((r) => r.id);
  } else if (/^[0-9,\s]+$/.test(ans)) {
    const idxs = ans.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    selected = idxs.map((i) => rows[i - 1]).filter(Boolean).map((r) => r.id);
  } else {
    // assume comma-separated ids
    selected = ans.split(',').map((s) => s.trim()).filter(Boolean);
  }

  if (!selected.length) {
    console.log('Nada seleccionado válido. Saliendo.');
    return;
  }

  console.log(`\nRespaldando ${selected.length} batch(es)...`);
  for (const id of selected) {
    try {
      await exportBatch(id, baseDir);
    } catch (e: any) {
      console.warn(`[error] Falló backup de ${id}: ${e?.message || e}`);
    }
  }

  console.log(`\nListo. Archivos en: ${baseDir}`);
}

main().finally(() => prisma.$disconnect());
