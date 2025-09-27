import { NextResponse } from 'next/server';
import { listPublic } from '@/lib/shows/service';
import { getShowsCacheVersion } from '@/lib/shows/cache';
import { isShowsFeatureEnabled } from '@/lib/featureFlags';

// In-memory snapshot cache with SWR semantics
interface Snapshot { data: any; version: number; freshUntil: number; staleUntil: number; cacheVersion: number; }
let snapshot: Snapshot | null = null;
const FRESH_MS = 60_000; // 60s
const STALE_MS = 180_000; // 180s (total window)

export const dynamic = 'force-dynamic';
export const revalidate = 0; // we'll manage manually

function buildResponse(data: any) {
  return NextResponse.json({ ok: true, updatedAt: data.maxUpdatedAt, shows: data.items });
}

async function loadFresh(): Promise<Snapshot> {
  const items = await listPublic();
  const maxUpdatedAt = items.reduce<string | null>((acc, s) => !acc || s.updatedAt > acc ? s.updatedAt : acc, null) || new Date().toISOString();
  const now = Date.now();
  return {
    data: { items, maxUpdatedAt },
    version: (snapshot?.version || 0) + 1,
    freshUntil: now + FRESH_MS,
    staleUntil: now + STALE_MS,
    cacheVersion: getShowsCacheVersion(),
  };
}

export async function GET() {
  if (!isShowsFeatureEnabled()) {
    return NextResponse.json({ ok: true, updatedAt: new Date().toISOString(), shows: [] });
  }
  const now = Date.now();
  if (!snapshot || now > snapshot.staleUntil || snapshot.cacheVersion !== getShowsCacheVersion()) {
    // fully expired or no cache
    snapshot = await loadFresh();
    return buildResponse(snapshot.data);
  }
  if (now <= snapshot.freshUntil) {
    // fresh
    return buildResponse(snapshot.data);
  }
  // stale but serve stale and trigger background refresh (no race control needed simple)
  loadFresh().then(s => { snapshot = s; }).catch(()=>{});
  return buildResponse(snapshot.data);
}

// Revalidation handled indirectly via version check (getShowsCacheVersion). No explicit export to avoid Next.js export restrictions.

