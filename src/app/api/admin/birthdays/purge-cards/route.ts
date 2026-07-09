import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { purgeReservations } from '@/lib/birthdays/service';

export async function POST(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN','STAFF']);
  if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED'?401:403);
  try {
    const body = await req.json().catch(()=>({}));
    const ids: string[] = Array.isArray(body?.reservationIds) ? body.reservationIds.filter((x:any)=>typeof x==='string') : [];
    if (!ids.length) return apiError('INVALID_BODY','reservationIds required');
    const result = await purgeReservations(ids, session?.userId);
    return apiOk({ ok:true, ...result });
  } catch(e:any) {
    return apiError('INTERNAL_ERROR','No se pudo purgar',{ raw: String(e?.message||e) });
  }
}
