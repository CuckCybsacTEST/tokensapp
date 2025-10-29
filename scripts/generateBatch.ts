#!/usr/bin/env tsx
/*
DEPRECATED MANUAL CLI.

Este script ahora actúa como wrapper deprecado.
Usa el modo nuevo:
  tsx scripts/generateBatch.ts --auto --days 7 [--desc "..."] [--qr|--no-qr] [--lazy-qr]

Realiza lo mismo que `POST /api/batch/generate-all`: consume TODO el stock (>0) de premios activos.
La antigua sintaxis (--prize / --multi / --count) ha sido eliminada para evitar divergencias.

Salida: carpeta con manifest.json, tokens.csv y opcionalmente png/*.png (si eager QR).
*/
import fs from 'fs';
import path from 'path';
import { logInfo, logError, logWarn } from '../src/lib/stdout';
import { prisma } from '../src/lib/prisma';
import { generateQrPngDataUrl } from '../src/lib/qr';
import { generateBatchCore } from '../src/lib/batch/generateBatchCore';

interface Args { [k: string]: any; }

function parseArgs(argv: string[]): Args {
  const args: Args = { qr: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--auto') args.auto = true;
    else if (a === '--days' || a === '--expiration' ) args.days = Number(argv[++i]);
    else if (a === '--desc') args.desc = argv[++i];
    else if (a === '--qr') args.qr = true;
    else if (a === '--no-qr') args.qr = false;
    else if (a === '--lazy-qr') args.lazyQr = true;
    else if (a === '--out') args.out = argv[++i];
  }
  return args;
}

function help() {
  console.log(`\nDeprecated manual batch CLI\n\nUso nuevo (auto):\n  tsx scripts/generateBatch.ts --auto --days 7 [--desc "Promo"] [--no-qr] [--lazy-qr]\n\nFlags:\n  --auto           Modo requerido (consume stock completo como generate-all)\n  --days <n>       Expiración (preset validado en endpoint; aquí se pasa tal cual)\n  --desc <text>    Descripción batch\n  --qr / --no-qr   Incluir PNG (default: --qr)\n  --lazy-qr        No generar PNG ahora (qrMode=lazy)\n  --out <dir>      Directorio destino (default ./out_auto_batch_<id>)\n`);
}

async function runAuto(args: Args) {
  if (!Number.isInteger(args.days) || args.days <= 0) {
    logError('cli_error', 'missing_or_invalid_days');
    process.exit(1);
  }
  const prizes = await prisma.prize.findMany({
    where: { active: true, stock: { not: null, gt: 0 } },
    select: { id: true, key: true, label: true, color: true, stock: true },
  });
  if (!prizes.length) {
    logWarn('cli_noop', 'NO_ACTIVE_PRIZES');
    await prisma.$disconnect();
    process.exit(0);
  }
  const prizeRequests = prizes.map(p => ({ prizeId: p.id, count: p.stock as number, expirationDays: args.days }));
  const { batch, tokens, meta, prizeEmittedTotals } = await generateBatchCore(prizeRequests, {
    expirationDays: args.days,
    includeQr: args.qr,
    lazyQr: !!args.lazyQr,
    description: args.desc,
  });

  // Load complete batch info including staticTargetUrl
  const fullBatch = await prisma.batch.findUnique({
    where: { id: batch.id },
    select: { id: true, createdAt: true, description: true, staticTargetUrl: true }
  });

  const outDir = args.out || path.resolve(process.cwd(), `out_auto_batch_${batch.id}`);
  fs.mkdirSync(outDir, { recursive: true });

  // Build manifest with prize summaries (aligning with API shape)
  const grouped = new Map<string, typeof tokens>();
  for (const t of tokens) {
    if (!grouped.has(t.prizeId)) grouped.set(t.prizeId, [] as any);
    grouped.get(t.prizeId)!.push(t as any);
  }
  const manifest: any = {
    batchId: batch.id,
    createdAt: batch.createdAt.toISOString(),
    description: batch.description,
    prizes: [] as any[],
    meta: { ...meta, prizeEmittedTotals },
  };
  for (const [pid, list] of grouped) {
    const first = list[0];
    manifest.prizes.push({
      prizeId: pid,
      prizeKey: first.prizeKey,
      prizeLabel: first.prizeLabel,
      count: list.length,
      expirationDays: args.days,
    });
  }
  manifest.totals = { tokens: tokens.length, prizes: manifest.prizes.length };

  const csvColumns = [
    'token_id','batch_id','prize_id','prize_key','prize_label','prize_color','expires_at_iso','expires_at_unix','signature','redeem_url','redeemed_at','disabled'
  ];
  const baseUrl = process.env.PUBLIC_BASE_URL || 'https://example.com';
  const csvRows = [csvColumns.join(',')];
  const eagerQr = args.qr && !args.lazyQr;
  
  // Determine URL prefix based on whether this is a static batch
  const urlPrefix = fullBatch?.staticTargetUrl !== null ? '/static/' : '/r/';
  
  for (const t of tokens) {
    const redeemUrl = `${baseUrl}${urlPrefix}${t.id}`;
    csvRows.push([
      t.id,
      batch.id,
      t.prizeId,
      t.prizeKey,
      t.prizeLabel,
      t.prizeColor || '',
      t.expiresAt.toISOString(),
      Math.floor(t.expiresAt.getTime()/1000).toString(),
      t.signature,
      redeemUrl,
      '',
      'false'
    ].map(csvEscape).join(','));
    if (eagerQr) {
      const dataUrl = await generateQrPngDataUrl(redeemUrl);
      const b64 = dataUrl.split(',')[1];
      const pngDir = path.join(outDir, 'png');
      fs.mkdirSync(pngDir, { recursive: true });
  const pngBuf = Buffer.from(b64, 'base64');
  fs.writeFileSync(path.join(pngDir, `${t.id}.png`), new Uint8Array(pngBuf));
    }
  }

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outDir, 'tokens.csv'), csvRows.join('\n'));
  logInfo('batch_auto_generated_cli', undefined, { batchId: batch.id, tokens: tokens.length, outDir, qrMode: meta.qrMode });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { help(); process.exit(0); }
  logWarn('deprecated_cli', 'Manual generateBatch CLI está deprecado. Usa --auto (generate-all semantics).');
  if (!args.auto) {
    logError('cli_error', 'missing --auto (manual mode eliminado)');
    help();
    process.exit(1);
  }
  await runAuto(args);
  await prisma.$disconnect();
}

function csvEscape(val: any) {
  if (val == null) return '';
  const s = String(val);
  if (!/[",\n\r]/.test(s)) return s;
  return '"' + s.replace(/"/g, '""') + '"';
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
