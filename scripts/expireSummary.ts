#!/usr/bin/env tsx
/*
Job: Count expired tokens and log summary event.
Usage:
  tsx scripts/expireSummary.ts [--days <N>] [--silent]
  --days <N>   Consider tokens expired for more than N days (default 0 = all expired)
  --silent     Do not print detailed list, only summary line

Creates an EventLog entry type=EXPIRE_SUMMARY with counts.
*/
import { prisma } from '../src/lib/prisma';
import { logEvent } from '../src/lib/log';
import { logInfo } from '../src/lib/stdout';

interface Args { days: number; silent: boolean }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  let days = 0; let silent = false;
  for (let i=0;i<a.length;i++) {
    const k = a[i];
    if (k === '--days') days = Number(a[++i]);
    else if (k === '--silent') silent = true;
    else if (k === '--help' || k === '-h') { help(); process.exit(0); }
  }
  if (isNaN(days) || days < 0) days = 0;
  return { days, silent };
}
function help(){ logInfo('cli_help', 'expireSummary'); }

async function main(){
  const { days, silent } = parseArgs();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const now = new Date();

  // Expired = expiresAt < now && redeemedAt IS NULL
  const expired = await prisma.token.findMany({
    where: { redeemedAt: null, expiresAt: { lt: now } },
    select: { id: true, prizeId: true, expiresAt: true, disabled: true },
  });
  const filtered = days > 0 ? expired.filter(t => t.expiresAt < cutoff) : expired;

  const totalExpired = expired.length;
  const totalFiltered = filtered.length;

  // Group by prize
  const byPrize = new Map<string, number>();
  for (const t of filtered) byPrize.set(t.prizeId, (byPrize.get(t.prizeId) || 0) + 1);
  const prizeIds = [...byPrize.keys()];
  const prizes = prizeIds.length ? await prisma.prize.findMany({ where: { id: { in: prizeIds } } }) : [];
  const pMap = new Map(prizes.map(p => [p.id, p]));

  const prizeStats = prizeIds.map(pid => ({
    prizeId: pid,
    prizeKey: pMap.get(pid)?.key || 'unknown',
    prizeLabel: pMap.get(pid)?.label || 'unknown',
    count: byPrize.get(pid)!,
  })).sort((a,b)=> b.count - a.count);

  await logEvent('EXPIRE_SUMMARY', 'Resumen expirados', {
    totalExpired,
    totalFiltered,
    daysThreshold: days,
    prizeStats,
  });

  if (!silent) {
  logInfo('expired_summary_detail', undefined, { totalExpired, totalFiltered, days, prizeStats });
  } else {
  logInfo('expired_summary_logged', undefined, { totalExpired, totalFiltered, days });
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
