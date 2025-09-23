import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie } from '@/lib/auth-user';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const adminRaw = getSessionCookieFromRequest(req);
    const adminSession = await verifySessionCookie(adminRaw);
    const userRaw = getUserCookie(req);
    const userSession = await verifyUserSessionCookie(userRaw);

    // Default permissions
    let canView = false;
    let canToggle = false;

    // Case 1: Admin panel session present (ADMIN/STAFF)
    const adminRoleCheck = requireRole(adminSession, ['ADMIN', 'STAFF']);
    if (adminRoleCheck.ok) {
      canView = true;
      if (adminSession?.role === 'ADMIN') canToggle = true;
      // STAFF via admin panel: no toggle por defecto (se gestiona desde perfil Caja)
    }

    // Case 2: BYOD user session present (permitir a STAFF de Caja ver y togglear)
    if (userSession?.role === 'STAFF') {
      const u = await prisma.user.findUnique({ where: { id: userSession.userId }, include: { person: true } });
      if (u?.person?.area === 'Caja') {
        canView = true;
        canToggle = true;
      }
    }

    // Si ninguna sesión válida, bloquear
    if (!canView && !canToggle) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    return NextResponse.json({ canView, canToggle }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
