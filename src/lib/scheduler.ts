/**
 * Scheduler for tokensEnabled.
 *
 * Behavior:
 * - On start, reconcile DB state: compute tokensEnabled (via computeTokensEnabled) and persist it.
 * - Schedule daily jobs (Option B – boundary enforcement):
 *   - 18:00 server local time: force tokensEnabled = true (start window)
 *   - 03:00 server local time: force tokensEnabled = false (end window)
 *   - Entre esos límites NO se fuerzan cambios: si un admin apaga dentro del tramo ON (>=18:00) queda OFF hasta las 03:00; si un admin enciende dentro del tramo OFF (<18:00) queda ON hasta las 18:00.
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
import { logInfo, logWarn, logError, logJson } from '@/lib/stdout';

// Simple log level gate. Levels: error < warn < info < debug
type LogLevel = 'error' | 'warn' | 'info' | 'debug';
function shouldLog(level: LogLevel): boolean {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
  const order: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };
  const normalized: LogLevel = (raw === 'error' || raw === 'warn' || raw === 'info' || raw === 'debug') ? raw : 'info';
  const current = order[normalized];
  return order[level] <= current;
}

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
  try { return await prisma.systemConfig.findUnique({ where: { id: 1 } }); } catch { return null; }
}

async function setTokensEnabled(value: boolean) {
  const existing = await readConfig();
  if (existing) {
    await prisma.systemConfig.update({ where: { id: 1 }, data: { tokensEnabled: value } });
  } else {
    await prisma.systemConfig.create({ data: { id: 1, tokensEnabled: value } });
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
  if (shouldLog('info')) logInfo('scheduler.reconcile', 'reconcile', { current, scheduled: desired, reason: computed.reason });
  // Ensure readers are fresh
    try { invalidateSystemConfigCache(); } catch { /* ignore */ }
    return { ok: true, computed };
  } catch (e) {
  if (shouldLog('error')) logError('scheduler.reconcile.error', 'reconcileOnce error', { error: String(e) });
    return { ok: false, error: String(e) };
  }
}

export function startScheduler() {
  if (started) {
    console.log('[scheduler] already started; skipping');
    return;
  }
  if (!cron) {
  if (shouldLog('warn')) logWarn('scheduler.cron.missing', 'node-cron not installed; running single reconcile');
    // run a single reconcile and return
  reconcileOnce().catch((e) => shouldLog('error') && logError('scheduler.reconcile.fail', 'reconcile failed', { error: String(e) }));
    // Also run a single birthdays expiration pass (best-effort)
  expireBirthdayTokensOnce().catch((e) => shouldLog('error') && logError('scheduler.birthdays.fail', 'expireBirthdayTokensOnce failed', { error: String(e) }));
    return;
  }

  // run immediate reconciliation
  reconcileOnce().catch((e) => shouldLog('error') && logError('scheduler.reconcile.fail', 'reconcile failed', { error: String(e) }));

  // Boundary enforcement jobs (Option B)
  // 18:00 -> FORZAR ON
  const job18 = cron.schedule('0 18 * * *', async () => {
    try {
      console.log('[scheduler] Enforcing ON at 18:00 Lima');
      await setTokensEnabled(true);
      if (shouldLog('info')) logInfo('scheduler.enforce.on', 'boundary 18:00 enforce ON');
    } catch (e) {
      console.error('[scheduler] Error enforcing ON:', e);
      if (shouldLog('error')) logError('scheduler.enforce.on.error', 'boundary 18:00 enforce failed', { error: String(e) });
    }
  }, { scheduled: true, timezone: TOKENS_TZ });

  // 03:00 -> FORZAR OFF
  const job03 = cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[scheduler] Enforcing OFF at 03:00 Lima');
      await setTokensEnabled(false);
      if (shouldLog('info')) logInfo('scheduler.enforce.off', 'boundary 03:00 enforce OFF');
    } catch (e) {
      console.error('[scheduler] Error enforcing OFF:', e);
      if (shouldLog('error')) logError('scheduler.enforce.off.error', 'boundary 03:00 enforce failed', { error: String(e) });
    }
  }, { scheduled: true, timezone: TOKENS_TZ });

  // Every minute: no enforcement; only log state for observability
  const jobMinute = cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Activar tokens con ventana horaria cuyo validFrom ya pasó (raw SQL para evitar dependencia de cliente regenerado)
      try {
        const enabled = await prisma.$executeRawUnsafe(`UPDATE "Token" SET "disabled"=false WHERE "disabled"=true AND "validFrom" IS NOT NULL AND "validFrom" <= $1 AND "expiresAt" > $1`, now as any);
        if (enabled && shouldLog('info') && enabled > 0) {
          logInfo('scheduler.hourly.enable', 'tokens activados por ventana horaria', { count: enabled });
        }
      } catch (e) {
        if (shouldLog('warn')) logWarn('scheduler.hourly.enable.error', 'fallo enable hourly', { error: String(e) });
      }
      if (shouldLog('debug')) {
        const cfg = await readConfig();
        const current = Boolean(cfg?.tokensEnabled);
        const scheduled = computeTokensEnabled({ now, tz: TOKENS_TZ }).enabled;
        logJson('debug', 'scheduler.heartbeat', undefined, { current, scheduled });
      }
    } catch (e) {
  if (shouldLog('error')) logError('scheduler.heartbeat.error', 'minute job failed', { error: String(e) });
    }
  }, { scheduled: true, timezone: TOKENS_TZ });

  // Birthdays: expire invite tokens periodically and emit minimal logs
  const jobBday = cron.schedule('*/10 * * * *', async () => {
    try {
  await expireBirthdayTokensOnce();
    } catch (e) {
  if (shouldLog('error')) logError('scheduler.birthdays.error', 'birthdays job failed', { error: String(e) });
    }
  }, { scheduled: true, timezone: TOKENS_TZ });

  // Staff birthdays: daily check at 09:00 Lima — logs collaborators with birthday today/this week
  const jobStaffBdays = cron.schedule('0 9 * * *', async () => {
    try {
      await logStaffBirthdaysToday();
    } catch (e) {
      if (shouldLog('error')) logError('scheduler.staff-birthdays.error', 'staff birthdays daily job failed', { error: String(e) });
    }
  }, { scheduled: true, timezone: TOKENS_TZ });

  jobs = [job18, jobBday, jobStaffBdays]; // jobMinute disabled for investigation
  if (shouldLog('info')) logInfo('scheduler.started', 'jobs scheduled', { boundaries: '18:00->ON 03:00->OFF', heartbeat: '1m (debug only)', birthdays: '10m', staffBirthdays: '09:00 daily' });
  started = true;
}

export function stopScheduler() {
  jobs.forEach((j) => { try { j.stop(); } catch (_) {} });
  jobs = [];
  if (shouldLog('info')) logInfo('scheduler.stopped', 'stopped all jobs');
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
  if (shouldLog('info')) logInfo('scheduler.birthdays.expire', `expired ${res.count} invite tokens`);
    }

    // Optional: notify old pending reservations
    const hours = Number(process.env.BIRTHDAY_PENDING_NOTIFY_HOURS || 24);
    if (Number.isFinite(hours) && hours > 0) {
      const cutoff = new Date(nowRef.getTime() - hours * 3600 * 1000);
      const pendingCount = await prisma.birthdayReservation.count({
        where: { status: 'pending_review', createdAt: { lt: cutoff as any } },
      });
      if (pendingCount > 0) {
  if (shouldLog('info')) logInfo('scheduler.birthdays.pending', 'pending reservations older than threshold', { count: pendingCount, hours });
      }
    }

    return { ok: true as const, expired: res.count };
  } catch (e) {
  if (shouldLog('error')) logError('scheduler.birthdays.expire.error', 'expire pass error', { error: String(e) });
    return { ok: false as const, error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Staff Birthdays daily log job
// Runs every day at 09:00 Lima. Queries active Person records whose birthday
// (month + day) matches today in Lima local time, then emits a server log.
// No writes to DB — purely informational.

const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;

export async function logStaffBirthdaysToday(nowRef: Date = new Date()) {
  try {
    const limaMs = nowRef.getTime() + LIMA_OFFSET_MS;
    const limaDate = new Date(limaMs);
    const todayMonth = limaDate.getUTCMonth() + 1;
    const todayDay = limaDate.getUTCDate();

    const persons = await prisma.person.findMany({
      where: { active: true, birthday: { not: null } },
      select: { id: true, name: true, area: true, jobTitle: true, birthday: true },
    });

    const todayBirthdays = persons.filter(p => {
      if (!p.birthday) return false;
      const b = p.birthday as Date;
      return (b.getUTCMonth() + 1) === todayMonth && b.getUTCDate() === todayDay;
    });

    if (todayBirthdays.length > 0) {
      if (shouldLog('info')) logInfo(
        'scheduler.staff-birthdays.today',
        `${todayBirthdays.length} colaborador(es) cumplen años hoy (${todayDay}/${todayMonth})`,
        { names: todayBirthdays.map(p => p.name) },
      );
    } else {
      if (shouldLog('debug')) logInfo('scheduler.staff-birthdays.today', 'No staff birthdays today');
    }

    return { ok: true as const, count: todayBirthdays.length };
  } catch (e) {
    if (shouldLog('error')) logError('scheduler.staff-birthdays.error', 'logStaffBirthdaysToday error', { error: String(e) });
    return { ok: false as const, error: String(e) };
  }
}
