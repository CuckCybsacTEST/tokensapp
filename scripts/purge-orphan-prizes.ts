/*
  Purge orphan prizes: prizes that have NO tokens (generated in any batch) and NO assignedTokens.
  Interpretation of user request: "premios sin lote" => a Prize that is not linked to any Batch via Token.prizeId.
  Safety features:
   - Dry run by default (shows list and count)
   - Pass --apply to actually delete
   - Skips prizes that have emittedTotal > 0 just in case of data mismatch (warns)

  Usage examples:
    tsx scripts/purge-orphan-prizes.ts           # dry run
    tsx scripts/purge-orphan-prizes.ts --apply   # execute deletions

  Optional env:
    DATABASE_URL=... tsx scripts/purge-orphan-prizes.ts
*/

import { prisma } from '../src/lib/prisma';

interface OrphanPrizeInfo { id: string; key: string; label: string; emittedTotal: number; stock: number | null; createdAt: Date }

async function findOrphans(): Promise<OrphanPrizeInfo[]> {
  // We rely on a left join style query: find prizes where no tokens reference their id and no assigned tokens.
  // Prisma approach: fetch prizes with aggregated token counts and filter client-side (efficient enough for small/medium sets).
  const prizes: Array<{ id: string; key: string; label: string; emittedTotal: number; stock: number | null; createdAt: Date; tokens: Array<{ id: string }>; assignedTokens: Array<{ id: string }> }> = await prisma.prize.findMany({
    select: { id: true, key: true, label: true, emittedTotal: true, stock: true, createdAt: true, tokens: { select: { id: true }, take: 1 }, assignedTokens: { select: { id: true }, take: 1 } },
  });
  return prizes
    .filter((p) => p.tokens.length === 0 && p.assignedTokens.length === 0)
    .map((p) => ({ id: p.id, key: p.key, label: p.label, emittedTotal: p.emittedTotal, stock: p.stock, createdAt: p.createdAt }));
}

function formatPrize(p: OrphanPrizeInfo) {
  return `${p.key} (${p.id}) stock=${p.stock ?? '-'} emitted=${p.emittedTotal} created=${p.createdAt.toISOString().slice(0,19).replace('T',' ')}`;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  const orphans = await findOrphans();
  if (!orphans.length) {
    console.log('No orphan prizes found.');
    return;
  }

  console.log(`Found ${orphans.length} orphan prize(s):`);
  for (const p of orphans) {
    const warn = p.emittedTotal > 0 ? '  [WARN emittedTotal>0]' : '';
    console.log(' -', formatPrize(p) + warn);
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to delete these prizes.');
    return;
  }

  // Safety: skip any with emittedTotal>0 (indicates mismatch) unless --force is present
  const force = args.includes('--force');
  const toDelete = orphans.filter(p => force || p.emittedTotal === 0);
  const skipped = orphans.length - toDelete.length;
  if (skipped) console.log(`Skipping ${skipped} prize(s) with emittedTotal>0 (use --force to override).`);

  if (!toDelete.length) {
    console.log('No prizes eligible for deletion after safety filters.');
    return;
  }

  const ids = toDelete.map(p => p.id);
  const del = await prisma.prize.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${del.count} prize(s).`);
}

main().catch(e => { console.error('[purge-orphan-prizes] Failed:', e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
