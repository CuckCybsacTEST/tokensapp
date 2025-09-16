import type { Prize } from "@prisma/client";

import { prisma } from "@/lib/prisma";

// Simple in-memory cache for Prize rows used during batch generation.
// Not intended for strong consistency; TTL-based soft cache to reduce DB lookups.

type CacheEntry = { prize: Prize; ts: number };
const cache = new Map<string, CacheEntry>();
let ttlMs = 30_000; // default 30s

export function configurePrizeCache(options: { ttlMs?: number } = {}) {
  if (options.ttlMs && options.ttlMs > 0) ttlMs = options.ttlMs;
}

function isFresh(entry: CacheEntry) {
  return Date.now() - entry.ts < ttlMs;
}

export async function getPrizesByIds(ids: string[]): Promise<Prize[]> {
  if (!ids.length) return [];
  const unique = [...new Set(ids)];
  const missing: string[] = [];
  const result: Prize[] = [];
  for (const id of unique) {
    const entry = cache.get(id);
    if (entry && isFresh(entry)) {
      result.push(entry.prize);
    } else {
      missing.push(id);
    }
  }
  if (missing.length) {
    const fetched = await prisma.prize.findMany({ where: { id: { in: missing } } });
    const now = Date.now();
    for (const p of fetched) {
      cache.set(p.id, { prize: p, ts: now });
      result.push(p);
    }
  }
  return result;
}

export function invalidatePrizeCache(id?: string) {
  if (id) cache.delete(id);
  else cache.clear();
}

// Allow environment override at module load.
const envTtl = Number(process.env.PRIZE_CACHE_TTL_MS);
if (!Number.isNaN(envTtl) && envTtl > 0) ttlMs = envTtl;
