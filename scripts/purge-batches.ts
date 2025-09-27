/*
 Interactive helper to purge batches via the internal API logic semantics (dry-run first).
 Steps:
 1. Lists recent batches (id, createdAt, tokens, redeemed/delivered counts if lightweight to compute).
 2. Lets you choose batches by indexes or explicit ids (supports: 1,3,5 | latest N | all).
 3. Performs a dry-run call to /api/system/tokens/purge-batches to show impact (tokens, sessions, spins, redeemed present).
 4. Requires explicit YES confirmation (typing the word PURGE) to proceed with destructive purge.
 5. Optional flag --delete-unused-prizes to also delete prizes left orphan after purge.

 Safety:
 - Always executes a dry-run first (cannot skip unless you modify the script).
 - Will refuse to continue if any selected batch has redeemed/delivered tokens unless you pass --force
 - Reads DATABASE_URL; if not set falls back to dev sqlite file for listing, but purge API must run against active server environment (so ensure `npm run dev` or prod server with correct DB).

 Usage examples:
   npm run purge:batches            -> interactive select + dry-run + confirm
   npm run purge:batches -- --delete-unused-prizes
   npm run purge:batches -- --force   (allows purge even if redeemed tokens)
*/
import readline from 'node:readline';
import { format } from 'node:util';
import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';

// Prisma only for listing convenience (uses same DB). We lazy-require to avoid type overhead if not installed.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client') as { PrismaClient: any };
const prisma = new PrismaClient();

interface BatchRow { id: string; description: string | null; createdAt: Date; _count: { tokens: number }; }

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

async function listBatches(limit=50): Promise<BatchRow[]> {
  return prisma.batch.findMany({ orderBy:{ createdAt:'desc'}, take: limit, select:{ id:true, description:true, createdAt:true, _count:{ select:{ tokens:true }}}});
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(question, ans => { rl.close(); res(ans); }));
}

function printTable(rows: BatchRow[]) {
  console.log('\nBatches recientes:');
  console.log('Idx  | Created At        | Tokens | Description');
  console.log('-----+-------------------+--------+-----------------------------');
  rows.forEach((r,i)=>{
    const idx = String(i+1).padStart(3,' ');
    const when = fmt(new Date(r.createdAt));
    const cnt = String(r._count.tokens).padStart(6,' ');
    const desc = (r.description||'').slice(0,40);
    console.log(`${idx} | ${when} | ${cnt} | ${desc}`);
  });
}

interface DryRunResponse {
  ok: boolean;
  dryRun: boolean;
  batchIds: string[];
  summary: {
    tokenCounts: { batchId: string; _count: { _all: number } }[];
    rouletteSessions: number;
    spins: number;
    redeemed: { batchId: string; _count: { _all: number } }[];
  };
}

async function callApi(batchIds: string[], opts:{ dryRun:boolean; deleteUnusedPrizes:boolean }): Promise<any> {
  const url = 'http://localhost:3000/api/system/tokens/purge-batches';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Cookie':'session=staff' }, // rely on staff/admin cookie present when running locally
    body: JSON.stringify({ batchIds, options: { dryRun: opts.dryRun, deleteUnusedPrizes: opts.deleteUnusedPrizes }})
  });
  const json = await resp.json().catch(()=>({ ok:false, error:'BAD_JSON'}));
  if (!resp.ok) throw new Error(`API error ${resp.status}: ${json?.error || json?.message || 'unknown'}`);
  return json;
}

function summarizeDryRun(d: DryRunResponse) {
  const lines = ['Dry-run summary:'];
  const redeemedMap = new Map(d.summary.redeemed.map(r=>[r.batchId, r._count._all] as const));
  for (const tc of d.summary.tokenCounts) {
    const redeemed = redeemedMap.get(tc.batchId) || 0;
    lines.push(`- Batch ${tc.batchId} -> tokens:${tc._count._all} redeemed/delivered:${redeemed}`);
  }
  lines.push(format('Roulette sessions: %d | spins: %d', d.summary.rouletteSessions, d.summary.spins));
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const deleteUnusedPrizes = args.includes('--delete-unused-prizes');
  const force = args.includes('--force');

  console.log('[purge-batches] Listing batches...');
  const rows = await listBatches();
  if (!rows.length) { console.log('No hay batches.'); return; }
  printTable(rows);

  const ans = (await prompt('\nSelecciona batches a eliminar (ej: 1,3,5 | latest 2 | all): ')).trim();
  let selected: string[] = [];
  if (!ans) { console.log('Nada seleccionado. Abort.'); return; }
  if (/^all$/i.test(ans)) selected = rows.map(r=>r.id);
  else if (/^latest\s+(\d{1,3})$/i.test(ans)) {
    const n = parseInt(ans.split(/\s+/)[1],10); selected = rows.slice(0, Math.min(rows.length, n)).map(r=>r.id);
  } else if (/^[0-9,\s]+$/.test(ans)) {
    const idxs = ans.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
    selected = idxs.map(i=>rows[i-1]).filter(Boolean).map(r=>r.id);
  } else {
    selected = ans.split(',').map(s=>s.trim()).filter(Boolean);
  }

  if (!selected.length) { console.log('Sin selección válida. Abort.'); return; }
  console.log(`\nDry-run API call for ${selected.length} batch(es)...`);
  const dry = await callApi(selected, { dryRun:true, deleteUnusedPrizes });
  console.log(summarizeDryRun(dry));

  const anyRedeemed = dry.summary.redeemed.some((r: { batchId: string; _count: { _all: number } })=>r._count._all>0);
  if (anyRedeemed && !force) {
    console.log('\n[seguridad] Hay tokens redimidos o entregados. Usa --force si realmente deseas purgar. Abort.');
    return;
  }

  const confirm = (await prompt('\nEscribe EXACTAMENTE "PURGE" para confirmar borrado permanente: ')).trim();
  if (confirm !== 'PURGE') { console.log('No confirmado. Abort.'); return; }

  console.log('\nEjecutando purge real...');
  const real = await callApi(selected, { dryRun:false, deleteUnusedPrizes });
  console.log('Resultado:', JSON.stringify(real, null, 2));

  // Opcional: log snapshot file
  const outDir = path.resolve(process.cwd(), 'purge_logs');
  fs.mkdirSync(outDir, { recursive:true });
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  fs.writeFileSync(path.join(outDir, `purge_${stamp}.json`), JSON.stringify({ drySummary: dry, result: real }, null, 2));
  console.log(`\nSnapshot escrito en purge_logs/purge_${stamp}.json`);
}

main().catch(e=>{ console.error('Error:', e); process.exitCode = 1; }).finally(()=>prisma.$disconnect());
