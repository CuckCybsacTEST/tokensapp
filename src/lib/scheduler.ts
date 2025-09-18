/**
 * Scheduler for tokensEnabled.
 *
 * Behavior:
 * - On start, reconcile DB state: compute tokensEnabled (via computeTokensEnabled) and persist it.
 * - Schedule daily jobs (Option B – boundary enforcement):
 *   - 18:00 server local time: force tokensEnabled = true (start window)
 *   - 00:00 server local time: force tokensEnabled = false (end window)
 *   - Entre esos límites NO se fuerzan cambios: si un admin apaga dentro del tramo ON (>=18:00) queda OFF hasta medianoche; si un admin enciende dentro del tramo OFF (<18:00) queda ON hasta las 18:00.
 *
 * Usage:
 *   import { startScheduler } from '@/lib/scheduler';
 *   // Call once during server bootstrap (e.g. in a custom server entrypoint)
 *   startScheduler();
 *
 * Notes:
 * - This module prefers `node-cron` to be installed. If it's not available it will log a warning
 *   and only run the one-time reconciliation.
 * - We use raw SQL through Prisma ($queryRawUnsafe/$executeRawUnsafe) so this works before
 *   Prisma Client is regenerated after schema changes. After running migrations and regenerating
 *   the client, the raw SQL can be replaced with typed calls.
 */

import { prisma } from '@/lib/prisma';
import { invalidateSystemConfigCache } from '@/lib/config';
import { computeTokensEnabled } from './tokensMode';

const TOKENS_TZ = process.env.TOKENS_TIMEZONE || 'America/Lima';

let cron: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  cron = require('node-cron');
} catch (e) {
  cron = null;
}

let jobs: any[] = [];
let started = false;

async function readConfig(): Promise<any> {
  const rows: any = await prisma.$queryRawUnsafe(`SELECT id, tokensEnabled FROM SystemConfig WHERE id = 1 LIMIT 1`);
  if (Array.isArray(rows) && rows.length) return rows[0];
  return null;
}

async function setTokensEnabled(value: boolean) {
  const rows: any = await prisma.$queryRawUnsafe(`SELECT id FROM SystemConfig WHERE id = 1 LIMIT 1`);
  const exists = Array.isArray(rows) && rows.length > 0;
  if (exists) {
    await prisma.$executeRawUnsafe(`UPDATE SystemConfig SET tokensEnabled = ${value ? 1 : 0}, updatedAt = CURRENT_TIMESTAMP WHERE id = 1`);
  } else {
    await prisma.$executeRawUnsafe(`INSERT INTO SystemConfig (id, tokensEnabled, updatedAt) VALUES (1, ${value ? 1 : 0}, CURRENT_TIMESTAMP)`);
  }
  // Invalidate in-memory cache so API routes and other readers see the fresh value immediately
  try { invalidateSystemConfigCache(); } catch { /* ignore */ }
}

export async function reconcileOnce() {
  try {
    const cfg = await readConfig();
    const computed = computeTokensEnabled({ now: new Date(), tz: TOKENS_TZ });
  const desired = computed.enabled;
  const current = Boolean(cfg?.tokensEnabled);
  // Reconcilia solo informativo (no cambia valor fuera de boundaries)
  console.log(`[scheduler] reconcile (current=${current}, scheduled=${desired}, reason=${computed.reason})`);
  // Ensure readers are fresh
    try { invalidateSystemConfigCache(); } catch { /* ignore */ }
    return { ok: true, computed };
  } catch (e) {
    console.error('[scheduler] reconcileOnce error', e);
    return { ok: false, error: String(e) };
  }
}

export function startScheduler() {
  if (started) {
    console.log('[scheduler] already started; skipping');
    return;
  }
  if (!cron) {
    console.warn('[scheduler] node-cron not installed — running single reconcile only');
    // run a single reconcile and return
    reconcileOnce().catch((e) => console.error('[scheduler] reconcile failed', e));
    // Also run a single birthdays expiration pass (best-effort)
    expireBirthdayTokensOnce().catch((e) => console.error('[scheduler] expireBirthdayTokensOnce failed', e));
    return;
  }

  // run immediate reconciliation
  reconcileOnce().catch((e) => console.error('[scheduler] reconcile failed', e));

  // Boundary enforcement jobs (Option B)
  // 18:00 -> FORZAR ON
  const job18 = cron.schedule('0 18 * * *', async () => {
    try {
      await setTokensEnabled(true);
      console.log('[scheduler][18:00] enforced ON');
    } catch (e) {
      console.error('[scheduler][18:00] enforcement failed', e);
    }
  }, { scheduled: true, timezone: TOKENS_TZ });

  // 00:00 -> FORZAR OFF
  const job00 = cron.schedule('0 0 * * *', async () => {
    try {
      await setTokensEnabled(false);
      console.log('[scheduler][00:00] enforced OFF');
    } catch (e) {
      console.error('[scheduler][00:00] enforcement failed', e);
    }
  }, { scheduled: true, timezone: TOKENS_TZ });

  // Every minute: no enforcement; only log state for observability
  const jobMinute = cron.schedule('* * * * *', async () => {
    try {
      const cfg = await readConfig();
      const current = Boolean(cfg?.tokensEnabled);
      const scheduled = computeTokensEnabled({ now: new Date(), tz: TOKENS_TZ }).enabled;
      console.log(`[scheduler][minute] heartbeat current=${current} scheduled=${scheduled}`);
    } catch (e) {
      console.error('[scheduler][minute] job failed', e);
    }
  }, { scheduled: true, timezone: TOKENS_TZ });

  // Birthdays: expire invite tokens periodically and emit minimal logs
  const jobBday = cron.schedule('*/10 * * * *', async () => {
    try {
      await expireBirthdayTokensOnce();
    } catch (e) {
      console.error('[scheduler][birthdays] job failed', e);
    }
  }, { scheduled: true, timezone: TOKENS_TZ });

  jobs = [job18, job00, jobBday, jobMinute];
  console.log('[scheduler] started jobs (boundary flips @18:00 ON @00:00 OFF; birthdays */10m expire; heartbeat */1m)');
  started = true;
}

export function stopScheduler() {
  jobs.forEach((j) => { try { j.stop(); } catch (_) {} });
  jobs = [];
  console.log('[scheduler] stopped');
  started = false;
}

export default { startScheduler, stopScheduler, reconcileOnce };

// ---------------------------------------------------------------------------
// Birthdays expiration job (idempotent)
// - Marks InviteToken rows as expired when expiresAt < now and status not in ('redeemed','expired').
// - Optionally logs pending reservations older than X hours (env BIRTHDAY_PENDING_NOTIFY_HOURS; default 24).
// - Safe to run frequently; emits minimal logs (only when actions occur or counts > 0).

export async function expireBirthdayTokensOnce(nowRef: Date = new Date()) {
  try {
    // Expire invite tokens
    const res = await prisma.inviteToken.updateMany({
      where: {
        expiresAt: { lt: nowRef as any },
        status: { notIn: ['redeemed', 'expired'] },
      },
      data: { status: 'expired' },
    });
    if (res.count && res.count > 0) {
      console.log(`[scheduler][birthdays] expired ${res.count} invite tokens`);
    }

    // Optional: notify old pending reservations
    const hours = Number(process.env.BIRTHDAY_PENDING_NOTIFY_HOURS || 24);
    if (Number.isFinite(hours) && hours > 0) {
      const cutoff = new Date(nowRef.getTime() - hours * 3600 * 1000);
      const pendingCount = await prisma.birthdayReservation.count({
        where: { status: 'pending_review', createdAt: { lt: cutoff as any } },
      });
      if (pendingCount > 0) {
        console.log(`[scheduler][birthdays] ${pendingCount} reservations pending_review > ${hours}h`);
      }
    }

    return { ok: true as const, expired: res.count };
  } catch (e) {
    console.error('[scheduler][birthdays] expire pass error', e);
    return { ok: false as const, error: String(e) };
  }
}
