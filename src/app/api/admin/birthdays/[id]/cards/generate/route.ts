import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { ensureBirthdayCards } from '@/lib/birthdays/cards';
import { getBirthdayQrBaseUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookie = getSessionCookieFromRequest(req as unknown as Request);
    const session = await verifySessionCookie(cookie);
    const authz = requireRole(session, ['ADMIN','STAFF']);
    if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);
    const baseUrl = getBirthdayQrBaseUrl(req.url);
    const result = await ensureBirthdayCards(params.id, baseUrl);
    return apiOk({ ok: true, ...result }, 200);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg === 'MISSING_TOKENS') return apiError('NO_TOKENS', 'No hay tokens para la reserva', undefined, 400);
    return apiError('INTERNAL_ERROR', 'Error generando tarjetas', { message: msg }, 500);
  }
}
