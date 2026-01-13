import JSZip from 'jszip';
import { prisma } from '../lib/prisma';

export type Manifest = {
  batchId: string;
  createdAt: string;
  description: string | null;
  prizes: Array<{ prizeId: string; prizeKey: string; prizeLabel: string; count: number }>;
};

export type RestoreResult = {
  batchId: string;
  created: number;
  skipped: number;
  updatedPrizeColors: number;
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

// Lima timezone helper: we store functionalDate as 05:00 UTC (local 00:00 Lima -5h offset)
function limaMidnightUtc(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
}

const datePatterns: RegExp[] = [
  /(\d{2})[.\/-](\d{2})[.\/-](\d{4})/,      // DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  /(\d{2})(\d{2})(\d{4})/,                   // DDMMYYYY
  /(\d{2})[.\/-](\d{2})[.\/-](\d{2})/       // DD.MM.YY
];

function deriveFunctionalDate(description: string | null | undefined, createdAt: Date): { fDate: Date, source: 'parsed' | 'derived' } {
  let y: number | undefined, m: number | undefined, d: number | undefined;
  if (description) {
    for (const rg of datePatterns) {
      const mt = description.match(rg);
      if (mt) {
        if (mt[0].length === 8 && /\d{8}/.test(mt[0])) { // DDMMYYYY
          d = parseInt(mt[1], 10); m = parseInt(mt[2], 10); y = parseInt(mt[3], 10);
        } else if (mt[3] && mt[3].length === 2) { // YY
          d = parseInt(mt[1], 10); m = parseInt(mt[2], 10); y = 2000 + parseInt(mt[3], 10);
        } else {
          d = parseInt(mt[1], 10); m = parseInt(mt[2], 10); y = parseInt(mt[3], 10);
        }
        break;
      }
    }
  }
  if (y && m && d) return { fDate: limaMidnightUtc(y, m, d), source: 'parsed' };
  // derive from createdAt shifting to Lima (using 8h shift to honor 03:00 AM cutoff for business day)
  const createdLocal = new Date(createdAt.getTime() - 8 * 3600 * 1000);
  y = createdLocal.getUTCFullYear(); m = createdLocal.getUTCMonth() + 1; d = createdLocal.getUTCDate();
  return { fDate: limaMidnightUtc(y, m, d), source: 'derived' };
}

export async function restoreFromZipBuffer(buf: Buffer): Promise<RestoreResult> {
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
  // Compute functionalDate (parsed or derived) so restored batches participate in daily metrics
  const { fDate } = deriveFunctionalDate(manifest.description, createdAt);

  const existing = await prisma.batch.findUnique({ where: { id: batchId }, select: { functionalDate: true } });
  await prisma.batch.upsert({
    where: { id: batchId },
    update: {
      description: manifest.description ?? undefined,
      // Only set functionalDate if it's currently null (avoid overwriting manual adjustments)
      functionalDate: existing?.functionalDate ? undefined : fDate,
    },
    create: { id: batchId, description: manifest.description, createdAt, functionalDate: fDate },
  });

  // Asegurar Prizes por manifest (id/key/label)
  for (const p of manifest.prizes) {
    const existing = await prisma.prize.findUnique({ where: { id: p.prizeId } }).catch(() => null);
    if (!existing) {
      try {
        await prisma.prize.create({ data: { id: p.prizeId, key: p.prizeKey, label: p.prizeLabel } });
      } catch {
        const altKey = `${p.prizeKey}-restored-${p.prizeId.slice(0,6)}`;
        await prisma.prize.create({ data: { id: p.prizeId, key: altKey, label: p.prizeLabel } });
      }
    }
  }

  // Insertar tokens (idempotente)
  let created = 0, skipped = 0, updatedPrizeColors = 0;
  const colorByPrize: Record<string, string | undefined> = {};
  const ingestNow = new Date();
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
          ingestedAt: ingestNow, // fecha real de importación
          redeemedAt: redeemedAt || undefined,
          disabled,
          signature,
          signatureVersion: 1,
        },
      });
      created++;
    } catch {
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

  // Alinear métricas del Prize
  for (const p of manifest.prizes) {
    const prize = await prisma.prize.findUnique({ where: { id: p.prizeId } });
    if (!prize) continue;
    const totalForPrize: number = await prisma.token.count({ where: { prizeId: p.prizeId } });
    const newLast = prize.lastEmittedAt && prize.lastEmittedAt > createdAt ? prize.lastEmittedAt : createdAt;
    await prisma.prize.update({
      where: { id: p.prizeId },
      data: { stock: 0, emittedTotal: totalForPrize, lastEmittedAt: newLast },
    });
  }

  return { batchId, created, skipped, updatedPrizeColors };
}
