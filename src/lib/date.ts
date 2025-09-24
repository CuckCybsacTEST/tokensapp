export type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export function ymdUtc(d: Date): string { return d.toISOString().slice(0, 10); }
export function startOfUtcDay(d: Date): Date { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
export function addDays(d: Date, days: number): Date { return new Date(d.getTime() + days * 86400000); }
export function startOfUtcWeek(d: Date): Date {
  const dow = d.getUTCDay() || 7; // 1..7 with Monday=1
  const monday = addDays(startOfUtcDay(d), -(dow - 1));
  return monday;
}
export function startOfUtcMonth(d: Date): Date { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function endExclusiveFromEndDay(endDay: string): Date {
  const [y, m, dd] = endDay.split('-').map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, (m - 1), dd + 1));
}
function ensureYmd(input?: string | null): string | null {
  if (!input) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  return input;
}

export function rangeFromPeriod(period: Period, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date;
  let end: Date;
  let name: Period = period;

  switch (period) {
    case 'today': {
      start = startOfUtcDay(now);
      end = addDays(start, 1);
      break;
    }
    case 'yesterday': {
      end = startOfUtcDay(now);
      start = addDays(end, -1);
      break;
    }
    case 'this_week': {
      start = startOfUtcWeek(now);
      end = addDays(start, 7);
      break;
    }
    case 'last_week': {
      const thisMonday = startOfUtcWeek(now);
      end = thisMonday;
      start = addDays(thisMonday, -7);
      break;
    }
    case 'this_month': {
      start = startOfUtcMonth(now);
      end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      break;
    }
    case 'last_month': {
      const thisMonthStart = startOfUtcMonth(now);
      end = thisMonthStart;
      start = new Date(Date.UTC(thisMonthStart.getUTCFullYear(), thisMonthStart.getUTCMonth() - 1, 1));
      break;
    }
    case 'custom':
    default: {
      const sd = ensureYmd(startDate);
      const ed = ensureYmd(endDate);
      if (!sd || !ed) throw new Error('Custom period requires valid startDate and endDate (YYYY-MM-DD)');
      start = new Date(sd + 'T00:00:00.000Z');
      const [y, m, dd] = ed.split('-').map((x) => parseInt(x, 10));
      end = new Date(Date.UTC(y, (m - 1), dd + 1));
      name = 'custom';
      break;
    }
  }

  const startDay = ymdUtc(start);
  const endDay = ymdUtc(addDays(end, -1)); // inclusive end day
  return { name, start, end, startIso: start.toISOString(), endIso: end.toISOString(), startDay, endDay };
}

/**
 * rangeBusinessDays:
 *  Igual que rangeFromPeriod pero semánticamente orientado a "business days" (días de trabajo)
 *  definidos por la columna Scan.businessDay. Por ahora, como el businessDay es un string YYYY-MM-DD
 *  derivado mediante un corrimiento horario fijo (sin DST), el rango de business days coincide
 *  1:1 con el rango de fechas calendario en UTC utilizado en rangeFromPeriod.
 *
 *  Futuras adaptaciones (DST u offsets variables) podrían redefinir aquí la lógica sin tocar
 *  el resto de consumidores.
 */
export function rangeBusinessDays(period: Period, startDate?: string, endDate?: string) {
  // Implementación inicial: delega a rangeFromPeriod.
  return rangeFromPeriod(period, startDate, endDate);
}
