import { prisma } from "@/lib/prisma";

let cache: { tokensEnabled: boolean; ts: number } | null = null;

export async function getSystemConfig(force = false) {
  const now = Date.now();
  if (!cache || force || now - cache.ts > 60000) {
    const cfg = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    cache = { 
      tokensEnabled: cfg?.tokensEnabled ?? true,
      ts: now 
    };
    console.log('System config cache updated:', cache);
  }
  return cache;
}

// Función auxiliar para invalidar explícitamente la caché
export function invalidateSystemConfigCache() {
  cache = null;
  console.log('System config cache invalidated');
}

// ----------------------------------------------
// Birthdays configuration helpers
// ----------------------------------------------

/**
 * Returns the TTL in hours for birthday invite claims.
 * Source: `process.env.BIRTHDAY_TOKEN_TTL_HOURS`; defaults to 72 when invalid or missing.
 */
export function getBirthdayTokenTtlHours(): number {
  const n = Number(process.env.BIRTHDAY_TOKEN_TTL_HOURS || 72);
  return Number.isFinite(n) && n > 0 ? n : 72;
}

/**
 * Returns the base URL used when composing QR target URLs for birthday invites.
 * Priority:
 * 1) `process.env.BIRTHDAY_QR_BASE_URL` if set (recommended for non-interactive jobs)
 * 2) The origin portion of the provided request URL when available
 * 3) `process.env.NEXT_PUBLIC_BASE_URL` as a generic fallback
 * 4) `http://localhost:3000`
 */
export function getBirthdayQrBaseUrl(urlOrReq?: string | URL): string {
  const env = (process.env.BIRTHDAY_QR_BASE_URL || '').trim();
  if (env) return env.replace(/\/$/, '');
  try {
    const u = typeof urlOrReq === 'string' ? new URL(urlOrReq) : urlOrReq;
    if (u && u.origin) return u.origin.replace(/\/$/, '');
  } catch {
    // ignore
  }
  const pub = (process.env.NEXT_PUBLIC_BASE_URL || '').trim();
  if (pub) return pub.replace(/\/$/, '');
  return 'http://localhost:3000';
}
