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
export function computeTokensEnabled(opts: { now?: Date; tz?: string }): ComputeResult {
  const tz = opts.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  // Build a DateTime in the desired tz (Luxon returns new instances)
  const baseNow: any = opts.now ? DateTime.fromJSDate(opts.now) : DateTime.now();
  const now: any = baseNow && typeof baseNow.setZone === 'function' ? baseNow.setZone(tz) : baseNow;

  // Helper to build next toggle ISO in the same zone
  const nextToggleIsoFor = (dt: any) => (typeof dt.toISO === 'function' ? dt.toISO() : new Date(dt).toISOString());

  // Default scheduled behavior
  const hour = now.hour; // 0..23 in the selected tz or runtime default
  const enabled = hour >= 18; // 18..23 enabled, 0..17 disabled
  const reason = enabled ? 'scheduled-18-00' : 'scheduled-off';
  const nextScheduled = computeNextScheduledToggle(now);
  return { enabled, reason, nextToggleIso: nextToggleIsoFor(nextScheduled) };
}

function computeNextScheduledToggle(now: any) {
  // If currently enabled (hour >= 18) next toggle is midnight (start of next day)
  // If currently disabled (hour < 18) next toggle is today at 18:00
  if (now.hour >= 18) {
    // next midnight: start of next day at 00:00
    return typeof now.plus === 'function' ? now.plus({ days: 1 }).startOf('day') : new Date(Date.now() + 24 * 3600 * 1000);
  }
  // today at 18:00
  return typeof now.set === 'function' ? now.set({ hour: 18, minute: 0, second: 0, millisecond: 0 }) : new Date(new Date().setUTCHours(18, 0, 0, 0));
}

