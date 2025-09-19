#!/usr/bin/env tsx
export {};
/**
 * Backfill script for two-phase redemption migration.
 *
 * Actions:
 * 1. Counts tokens where redeemedAt IS NOT NULL AND revealedAt IS NULL (legacy single-phase tokens).
 * 2. (If not --dry) Updates those rows setting:
 *      revealedAt = redeemedAt
 *      deliveredAt = redeemedAt
 *      assignedPrizeId = prizeId (only if assignedPrizeId is NULL)
 * 3. Reports before/after metrics.
 *
 * Usage:
 *   npx tsx scripts/backfill-two-phase.ts --dry   # dry run (no writes)
 *   npx tsx scripts/backfill-two-phase.ts         # perform updates
 */

// Import without TS path alias to avoid resolution issues in standalone script
import { prisma } from "../src/lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const started = Date.now();

  // Metrics BEFORE
  // @ts-ignore (fields added in recent migration; types may lag if editor didn't reload)
  const [totalTokens, legacyCount, revealedCount, deliveredCount] = await Promise.all([
    prisma.token.count(),
    // @ts-ignore
    prisma.token.count({ where: { redeemedAt: { not: null }, revealedAt: null } }),
    // @ts-ignore
    prisma.token.count({ where: { revealedAt: { not: null } } }),
    // @ts-ignore
    prisma.token.count({ where: { deliveredAt: { not: null } } }),
  ]);

  console.log('[two-phase backfill] START');
  console.log(JSON.stringify({ dry, totalTokens, legacyNeedingBackfill: legacyCount, alreadyRevealed: revealedCount, alreadyDelivered: deliveredCount }, null, 2));

  let updated = 0;
  if (!dry && legacyCount > 0) {
    // Single bulk update using raw SQL for efficiency (SQLite compatible)
    // Update only rows still matching the legacy condition.
    const result = await prisma.$executeRawUnsafe(
      `UPDATE Token
       SET revealedAt = redeemedAt,
           deliveredAt = redeemedAt,
           assignedPrizeId = COALESCE(assignedPrizeId, prizeId)
       WHERE redeemedAt IS NOT NULL AND revealedAt IS NULL`
    );
    updated = Number(result) || 0;
  }

  // Metrics AFTER
  // @ts-ignore
  const [legacyAfter, revealedAfter, deliveredAfter] = await Promise.all([
    // @ts-ignore
    prisma.token.count({ where: { redeemedAt: { not: null }, revealedAt: null } }),
    // @ts-ignore
    prisma.token.count({ where: { revealedAt: { not: null } } }),
    // @ts-ignore
    prisma.token.count({ where: { deliveredAt: { not: null } } }),
  ]);

  const finished = Date.now();
  const ms = finished - started;

  console.log(JSON.stringify({
    dry,
    updated,
    legacyRemaining: legacyAfter,
    revealedAfter,
    deliveredAfter,
    durationMs: ms
  }, null, 2));
  console.log('[two-phase backfill] END');
}

main().catch(e => {
  console.error('[two-phase backfill] ERROR', e);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
