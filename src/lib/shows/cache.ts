import { revalidateTag } from 'next/cache';

let version = 0;

export function invalidateShowsCache() {
  version++;
  try { revalidateTag('shows_public'); } catch { /* ignore in non-app contexts */ }
}

export function getShowsCacheVersion() { return version; }
