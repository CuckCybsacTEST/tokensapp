import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const auth = requireRole(session, ['ADMIN', 'STAFF']);
  if (!auth.ok) return apiError(auth.error || 'UNAUTHORIZED', 'UNAUTHORIZED', undefined, auth.error === 'UNAUTHORIZED' ? 401 : 403);
  try {
    const packs = await prisma.birthdayPack.findMany({ orderBy: { name: 'asc' } });
    return apiOk({ packs: packs.map(p => ({ id: p.id, name: p.name, qrCount: p.qrCount, bottle: p.bottle, featured: p.featured, active: p.active, perks: safeJson(p.perks) })) });
  } catch (e) {
    return apiError('PACKS_LIST_FAILED', 'No se pudieron listar');
  }
}

function safeJson(s: string | null) { try { const v = JSON.parse(s||'[]'); return Array.isArray(v)? v : []; } catch { return []; } }
