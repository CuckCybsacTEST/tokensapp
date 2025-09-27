import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie } from '@/lib/auth-user';

export async function GET(req: Request) {
  try {
    const adminRaw = getSessionCookieFromRequest(req);
    const adminSession = await verifySessionCookie(adminRaw);
    const userRaw = getUserCookie(req);
    const userSession = await verifyUserSessionCookie(userRaw);

    // Nueva política: cualquier STAFF (en admin_session o user_session) puede ver y togglear.
    // ADMIN también (obvio). COLLAB no.
    let isStaff = false;
    if (requireRole(adminSession, ['ADMIN','STAFF']).ok) {
      isStaff = adminSession?.role === 'STAFF' || adminSession?.role === 'ADMIN';
    }
    if (!isStaff && userSession?.role === 'STAFF') {
      isStaff = true;
    }
    if (!isStaff) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    return NextResponse.json({ canView: true, canToggle: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
