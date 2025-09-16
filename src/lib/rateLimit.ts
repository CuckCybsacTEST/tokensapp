// Simple in-memory fixed window rate limiter
// NOT suitable for multi-instance horizontally scaled deployments (would need Redis, etc.)

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LIMIT = 30; // 30 requests per window

// Lightweight cleanup to avoid unbounded growth
function cleanup(now: number) {
  if (store.size > 500) {
    for (const [k, v] of store) {
      if (v.resetAt < now) store.delete(k);
    }
  }
}

export function checkRateLimit(key: string) {
  const now = Date.now();
  let e = store.get(key);
  if (!e || now > e.resetAt) {
    e = { count: 0, resetAt: now + WINDOW_MS };
  }
  e.count += 1;
  store.set(key, e);
  cleanup(now);
  if (e.count > LIMIT) {
    const retryAfterSeconds = Math.ceil((e.resetAt - now) / 1000);
    return { ok: false as const, retryAfterSeconds };
  }
  return {
    ok: true as const,
    remaining: Math.max(0, LIMIT - e.count),
    resetAt: e.resetAt,
  };
}

// Same store, but configurable limit and window per key
export function checkRateLimitCustom(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let e = store.get(key);
  if (!e || now > e.resetAt) {
    e = { count: 0, resetAt: now + windowMs };
  }
  e.count += 1;
  store.set(key, e);
  cleanup(now);
  if (e.count > limit) {
    const retryAfterSeconds = Math.ceil((e.resetAt - now) / 1000);
    return { ok: false as const, retryAfterSeconds };
  }
  return {
    ok: true as const,
    remaining: Math.max(0, limit - e.count),
    resetAt: e.resetAt,
  };
}

// Used only in tests to clear state between cases
export function __resetRateLimitStore() {
  store.clear();
}
