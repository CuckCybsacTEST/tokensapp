import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getBirthdayCards } from '@/lib/birthdays/cards';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookie = getSessionCookieFromRequest(req as unknown as Request);
    const session = await verifySessionCookie(cookie);
    const authz = requireRole(session, ['ADMIN','STAFF']);
    if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);
    const data = await getBirthdayCards(params.id);
    return apiOk({ ok: true, paths: data.paths });
  } catch (e: any) {
    return apiError('INTERNAL_ERROR','Error listando tarjetas',{ message: String(e?.message || e) },500);
  }
}
