let DateTime: any;
try {
  // prefer luxon if available
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTime = require('luxon').DateTime;
} catch (e) {
  // lightweight fallback using JS Date in UTC (no TZ handling)
  DateTime = {
    now: () => ({
      hour: new Date().getUTCHours(),
      plus: ({ days }: { days: number }) => ({ startOf: (_: string) => new Date(Date.now() + days * 86400000) }),
      set: (opts: any) => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), opts.hour || 0, opts.minute || 0, 0, 0)),
      toISO: () => new Date().toISOString(),
    }),
    fromJSDate: (d: Date) => ({
      hour: d.getUTCHours(),
      plus: ({ days }: { days: number }) => ({ startOf: (_: string) => new Date(d.getTime() + days * 86400000) }),
      set: (opts: any) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), opts.hour || 0, opts.minute || 0, 0, 0)),
      toISO: () => d.toISOString(),
    }),
  };
}

export type ComputeResult = {
  enabled: boolean;
  reason: 'scheduled-18-00' | 'scheduled-off' | string;
  nextToggleIso?: string; // ISO string with offset in provided tz
};

/**
 * Compute whether tokens are enabled based on the time of day:
 * Enabled between 18:00 (inclusive) and 00:00 (exclusive) in provided tz.
 *
 * tz: IANA timezone string (e.g. 'America/Argentina/Buenos_Aires'). If not provided,
 * we use the runtime's resolved timeZone via Intl; fallback to UTC.
 */
const DEFAULT_TZ = process.env.TOKENS_TIMEZONE || 'America/Lima';

export function computeTokensEnabled(opts: { now?: Date; tz?: string }): ComputeResult {
  const tz = opts.tz || DEFAULT_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  // Build a DateTime in the desired tz (Luxon returns new instances)
  const baseNow: any = opts.now ? DateTime.fromJSDate(opts.now) : DateTime.now();
  const now: any = baseNow && typeof baseNow.setZone === 'function' ? baseNow.setZone(tz) : baseNow;

  // Helper to build next toggle ISO in the same zone
  const nextToggleIsoFor = (dt: any) => (typeof dt.toISO === 'function' ? dt.toISO() : new Date(dt).toISOString());

  // Default scheduled behavior: Enabled between 18:00 and 03:00 (inclusive-exclusive)
  const hour = now.hour; // 0..23 in the selected tz or runtime default
  const enabled = hour >= 18 || hour < 3; 
  const reason = enabled ? 'scheduled-active' : 'scheduled-off';
  const nextScheduled = computeNextScheduledToggle(now);
  return { enabled, reason, nextToggleIso: nextToggleIsoFor(nextScheduled) };
}

function computeNextScheduledToggle(now: any) {
  // If currently enabled (18:00 - 03:00):
  // - If hour >= 18, toggle is at 03:00 of tomorrow.
  // - If hour < 3, toggle is at 03:00 of today.
  if (now.hour >= 18 || now.hour < 3) {
    if (now.hour >= 18) {
      return typeof now.plus === 'function' ? now.plus({ days: 1 }).set({ hour: 3, minute: 0, second: 0, millisecond: 0 }) : new Date(new Date().setHours(3, 0, 0, 0) + 24 * 3600 * 1000);
    } else {
      return typeof now.set === 'function' ? now.set({ hour: 3, minute: 0, second: 0, millisecond: 0 }) : new Date(new Date().setHours(3, 0, 0, 0));
    }
  }
  // If currently disabled (03:00 - 18:00): next toggle is 18:00 of today.
  return typeof now.set === 'function' ? now.set({ hour: 18, minute: 0, second: 0, millisecond: 0 }) : new Date(new Date().setHours(18, 0, 0, 0));
}

