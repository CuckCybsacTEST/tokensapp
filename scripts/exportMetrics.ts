#!/usr/bin/env tsx
/*
Export redemption metrics to CSV.
Usage:
  tsx scripts/exportMetrics.ts [--from 2025-01-01] [--to 2025-01-31] [--out metrics.csv]

Filters apply to redeemedAt (for redeemed counts/time range). Totals are global unless --from/--to are set,
where redeemed_tokens and related rate consider only tokens redeemed in range while total_tokens remains overall.
*/
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { logInfo } from '../src/lib/stdout';

interface Args { from?: Date; to?: Date; out: string; birthdaysOut: string }

function parseArgs(): Args {
  const a = process.argv.slice(2);
  let from: Date | undefined;
  let to: Date | undefined;
  let out = 'metrics.csv';
  let birthdaysOut = 'metrics.birthdays.csv';
  for (let i=0;i<a.length;i++) {
    const k = a[i];
    if (k === '--from') { const v = a[++i]; if (!v) throw new Error('--from requires value'); from = new Date(v + 'T00:00:00Z'); }
    else if (k === '--to') { const v = a[++i]; if (!v) throw new Error('--to requires value'); to = new Date(v + 'T23:59:59.999Z'); }
    else if (k === '--out') { out = a[++i] || out; }
    else if (k === '--birthdays-out') { birthdaysOut = a[++i] || birthdaysOut; }
    else if (k === '--help' || k === '-h') { printHelp(); process.exit(0); }
  }
  return { from, to, out, birthdaysOut };
}

function printHelp() { logInfo('cli_help', 'exportMetrics'); }

async function main() {
  const { from, to, out, birthdaysOut } = parseArgs();
  const now = new Date();

  // Load prizes and tokens minimal fields
  const prizes = await prisma.prize.findMany({ orderBy: { createdAt: 'asc' } });
  const prizeIds = prizes.map(p=>p.id);

  // We fetch aggregated counts using groupBy where possible for performance
  // Total tokens per prize
  const totalTokens = await prisma.token.groupBy({ by:['prizeId'], _count:{ _all:true }, where:{ prizeId: { in: prizeIds } } });

  // Redeemed tokens (overall and filtered range)
  const redeemedOverall = await prisma.token.groupBy({ by:['prizeId'], _count:{ _all:true }, where:{ prizeId:{ in: prizeIds }, redeemedAt: { not: null } } });
  const redeemedFiltered = (from || to) ? await prisma.token.groupBy({ by:['prizeId'], _count:{ _all:true }, where:{ prizeId:{ in: prizeIds }, redeemedAt: { gte: from, lte: to } } }) : redeemedOverall;

  // Disabled tokens
  const disabledTokens = await prisma.token.groupBy({ by:['prizeId'], _count:{ _all:true }, where:{ prizeId:{ in: prizeIds }, disabled:true } });
  // Expired (unredeemed and past expiration)
  const expiredTokens = await prisma.token.groupBy({ by:['prizeId'], _count:{ _all:true }, where:{ prizeId:{ in: prizeIds }, redeemedAt: null, expiresAt: { lt: now } } });

  // First & last redemption times (overall)
  const firstRedeemedRaw = await prisma.token.findMany({ where:{ prizeId:{ in: prizeIds }, redeemedAt:{ not: null } }, orderBy:{ redeemedAt:'asc' }, select:{ prizeId:true, redeemedAt:true } });
  const lastRedeemedRaw = await prisma.token.findMany({ where:{ prizeId:{ in: prizeIds }, redeemedAt:{ not: null } }, orderBy:{ redeemedAt:'desc' }, select:{ prizeId:true, redeemedAt:true } });
  const firstMap = new Map<string, Date>();
  for (const r of firstRedeemedRaw) if (!firstMap.has(r.prizeId)) firstMap.set(r.prizeId, r.redeemedAt!);
  const lastMap = new Map<string, Date>();
  for (const r of lastRedeemedRaw) if (!lastMap.has(r.prizeId)) lastMap.set(r.prizeId, r.redeemedAt!);

  function mapCount(arr: { prizeId:string; _count:{ _all:number } }[]) {
    const m = new Map<string, number>();
    for (const x of arr) m.set(x.prizeId, x._count._all);
    return m;
  }
  const mTotal = mapCount(totalTokens);
  const mRedeemedOverall = mapCount(redeemedOverall);
  const mRedeemedFiltered = mapCount(redeemedFiltered);
  const mDisabled = mapCount(disabledTokens);
  const mExpired = mapCount(expiredTokens);

  const rows: string[] = [];
  const headers = [
    'prize_id','prize_key','prize_label','active','total_tokens','redeemed_overall','redeemed_filtered','redeemed_rate_filtered','remaining_unredeemed','expired_unredeemed','disabled_tokens','first_redeemed_at','last_redeemed_at'
  ];
  rows.push(headers.join(','));

  for (const p of prizes) {
    const total = mTotal.get(p.id) || 0;
    const redeemedAll = mRedeemedOverall.get(p.id) || 0;
    const redeemedRange = mRedeemedFiltered.get(p.id) || 0;
    const disabled = mDisabled.get(p.id) || 0;
    const expired = mExpired.get(p.id) || 0;
    // remaining unredeemed (excluding expired and disabled but still valid)
    const remaining = Math.max(0, total - redeemedAll - expired - disabled);
    const rate = redeemedRange && total ? (redeemedRange / total) * 100 : 0;
    const first = firstMap.get(p.id)?.toISOString() || '';
    const last = lastMap.get(p.id)?.toISOString() || '';

    const data = [
      p.id,
      p.key,
      csvEscape(p.label),
      p.active ? 'true':'false',
      total.toString(),
      redeemedAll.toString(),
      redeemedRange.toString(),
      rate.toFixed(2),
      remaining.toString(),
      expired.toString(),
      disabled.toString(),
      first,
      last,
    ];
    rows.push(data.join(','));
  }

  fs.writeFileSync(path.resolve(process.cwd(), out), rows.join('\n'));
  logInfo('metrics_exported', undefined, { file: out });

  // --------------------------------------
  // Birthdays metrics export (optional)
  // --------------------------------------
  try {
    // Load reservations minimal fields
    const reservations = await prisma.birthdayReservation.findMany({ select: { id:true, createdAt:true, status:true } });

    // Monthly counts (by createdAt month)
    function yyyymm(d: Date) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth()+1).padStart(2,'0');
      return `${y}-${m}`;
    }
    const byMonth = new Map<string, { created:number; approved:number }>();
    for (const r of reservations) {
      const key = yyyymm(r.createdAt);
      const v = byMonth.get(key) || { created:0, approved:0 };
      v.created += 1;
      if (r.status === 'approved') v.approved += 1;
      byMonth.set(key, v);
    }

    // Show-up rate: #redemptions / #tokens (overall and filtered)
    const totalTokens = await prisma.inviteToken.count();
    const redeemedOverall = await prisma.tokenRedemption.count();
    const redeemedFiltered = (from || to)
      ? await prisma.tokenRedemption.count({ where: { redeemedAt: { gte: from, lte: to } } })
      : redeemedOverall;
    const showOverall = totalTokens ? (redeemedOverall / totalTokens) * 100 : 0;
    const showFiltered = totalTokens ? (redeemedFiltered / totalTokens) * 100 : 0;

    // Write a separate CSV so we do not change the primary tokens CSV format
    const bRows: string[] = [];
    const bHeaders = [
      'month','reservations_created','reservations_approved','total_tokens','redeemed_overall','redeemed_filtered','showup_rate_overall','showup_rate_filtered'
    ];
    bRows.push(bHeaders.join(','));
    // Sort months ascending
    const months = Array.from(byMonth.keys()).sort();
    for (const m of months) {
      const v = byMonth.get(m)!;
      bRows.push([
        m,
        String(v.created),
        String(v.approved),
        '',
        '',
        '',
        '',
        ''
      ].join(','));
    }
    // Summary row
    bRows.push([
      'ALL',
      String(reservations.length),
      String(reservations.filter(r=>r.status==='approved').length),
      String(totalTokens),
      String(redeemedOverall),
      String(redeemedFiltered),
      showOverall.toFixed(2),
      showFiltered.toFixed(2)
    ].join(','));

    const bPath = path.resolve(process.cwd(), birthdaysOut);
    fs.writeFileSync(bPath, bRows.join('\n'));
    logInfo('birthdays_metrics_exported', undefined, { file: birthdaysOut, months: months.length, totalTokens, redeemedOverall, redeemedFiltered });

    // Console friendly summary of the current month and totals
    const nowKey = yyyymm(now);
    const currentMonth = byMonth.get(nowKey) || { created: 0, approved: 0 };
    console.log(`[birthdays] month=${nowKey} created=${currentMonth.created} approved=${currentMonth.approved} overall_showup=${showOverall.toFixed(2)}% filtered_showup=${showFiltered.toFixed(2)}%`);
  } catch (e) {
    // If birthdays tables are not present, skip silently to avoid breaking existing flows
    console.warn('[birthdays] metrics skipped:', (e as any)?.code || (e as any)?.message || String(e));
  }

  await prisma.$disconnect();
}

function csvEscape(val: string) {
  if (val == null) return '';
  const needs = /[",\n\r]/.test(val);
  if (!needs) return val;
  return '"' + val.replace(/"/g, '""') + '"';
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
