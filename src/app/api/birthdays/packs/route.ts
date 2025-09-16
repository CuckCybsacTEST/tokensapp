import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';
import { checkRateLimit } from '@/lib/rateLimit';
import { isBirthdaysEnabledPublic } from '@/lib/featureFlags';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { corsHeadersFor } from '@/lib/cors';

export async function GET(req: NextRequest) {
  const cors = corsHeadersFor(req as unknown as Request);
  // If public flag is off, still allow ADMIN/STAFF to fetch packs from admin UI.
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const isAdmin = !!session && requireRole(session, ['ADMIN', 'STAFF']).ok;
  if (!isBirthdaysEnabledPublic() && !isAdmin) {
    return apiError('NOT_FOUND', 'Not found', undefined, 404, cors);
  }
  // Rate limit only for public requests; skip for admin/staff
  if (!isAdmin) {
    const ip = req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown';
    const rl = checkRateLimit(`birthdays:packs:${ip}`);
    if (!rl.ok) {
      return apiError('RATE_LIMITED', 'Too many requests', undefined, 429, { ...cors, 'Retry-After': String(rl.retryAfterSeconds) });
    }
  }
  try {
    const packs = await prisma.birthdayPack.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    const data = packs.map((p) => ({
      id: p.id,
      name: p.name,
      qrCount: p.qrCount,
      bottle: p.bottle,
      featured: p.featured,
      perks: safeParseJsonArray(p.perks),
    }));
    return apiOk({ packs: data }, 200, cors);
  } catch (e) {
    return apiError('PACKS_FETCH_ERROR', 'Failed to load packs', undefined, 500, cors);
  }
}

export async function OPTIONS(req: NextRequest) {
  const cors = corsHeadersFor(req as unknown as Request);
  return new Response(null, { status: 204, headers: cors });
}

function safeParseJsonArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
