// Lightweight performance helpers for browser-only instrumentation.
// Safe in SSR: no-ops when window/performance are unavailable.

function hasPerf() {
  return typeof window !== 'undefined' && typeof performance !== 'undefined' && !!performance.mark && !!performance.measure;
}

export function perfMark(name: string) {
  try {
    if (hasPerf()) performance.mark(name);
  } catch {}
}

export function perfMeasure(name: string, startMark: string, endMark: string) {
  try {
    if (!hasPerf()) return;
    const m = performance.measure(name, startMark, endMark);
    // Stash minimal data for quick inspection
    (window as any).__roulettePerf = (window as any).__roulettePerf || [];
    (window as any).__roulettePerf.push({ name, duration: m.duration });
  } catch {}
}

export function perfSummarize(label = 'roulette-perf') {
  try {
    const arr = ((window as any).__roulettePerf || []) as { name: string; duration: number }[];
    if (!arr.length) return;
    const byName: Record<string, number[]> = {};
    for (const e of arr) {
      (byName[e.name] = byName[e.name] || []).push(e.duration);
    }
    const summary = Object.entries(byName).map(([name, vals]) => {
      const total = vals.reduce((a, b) => a + b, 0);
      const avg = total / vals.length;
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      return { name, count: vals.length, avg: Math.round(avg), min: Math.round(min), max: Math.round(max) };
    });
    // eslint-disable-next-line no-console
    console.table(summary, ['name', 'count', 'avg', 'min', 'max']);
    return summary;
  } catch {}
}

export function perfGetLastDuration(name: string): number | null {
  try {
    if (typeof window === 'undefined' || typeof performance === 'undefined' || !performance.getEntriesByName) return null;
    const entries = performance.getEntriesByName(name);
    if (!entries.length) return null;
    const last = entries[entries.length - 1] as PerformanceMeasure;
    return last.duration ?? null;
  } catch {
    return null;
  }
}

export function perfCheckBudget(name: string, budgetMs: number, tag = 'budget') {
  try {
    const d = perfGetLastDuration(name);
    if (d == null) return null;
    const ok = d <= budgetMs;
    // eslint-disable-next-line no-console
    console[ok ? 'log' : 'warn'](`[perf:${tag}] ${name}: ${Math.round(d)}ms ${ok ? 'OK' : `> ${budgetMs}ms`}`);
    (window as any).__roulettePerfBudget = (window as any).__roulettePerfBudget || [];
    (window as any).__roulettePerfBudget.push({ name, duration: d, budget: budgetMs, ok });
    return ok;
  } catch {
    return null;
  }
}
