import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';
import { checkRateLimit } from '@/lib/rateLimit';
import { isBirthdaysEnabledPublic } from '@/lib/featureFlags';

export async function GET(req: NextRequest) {
  if (!isBirthdaysEnabledPublic()) {
    return apiError('NOT_FOUND', 'Not found', undefined, 404);
  }
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const rl = checkRateLimit(`birthdays:packs:${ip}`);
  if (!rl.ok) {
    return apiError('RATE_LIMITED', 'Too many requests', undefined, 429, { 'Retry-After': String(rl.retryAfterSeconds) });
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
    return apiOk({ packs: data });
  } catch (e) {
    return apiError('PACKS_FETCH_ERROR', 'Failed to load packs');
  }
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
