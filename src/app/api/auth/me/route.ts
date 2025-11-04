import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie, SessionRole, getSessionCookieFromRequest } from '@/lib/auth';
import { verifyUserSessionCookie, getUserSessionCookieFromRequest, UserSessionRole } from '@/lib/auth-user';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // First, try to get admin session
    const adminCookie = getSessionCookieFromRequest(request);
    if (adminCookie) {
      const adminSession = await verifySessionCookie(adminCookie);
      if (adminSession) {
        // Mapear roles a nombres legibles
        const roleDisplayNames: Record<SessionRole, string> = {
          'ADMIN': 'Administrador',
          'STAFF': 'Staff',
          'COLLAB': 'Colaborador',
          'VIP': 'VIP',
          'MEMBER': 'Miembro',
          'GUEST': 'Invitado'
        };

        return NextResponse.json({
          role: adminSession.role || 'ADMIN',
          displayName: roleDisplayNames[adminSession.role || 'ADMIN']
        });
      }
    }

    // If no admin session, check for user session
    const userCookie = getUserSessionCookieFromRequest(request);
    if (userCookie) {
      const userSession = await verifyUserSessionCookie(userCookie);
      if (userSession && userSession.role === 'STAFF') {
        // Get user details from database
        const user = await prisma.user.findUnique({
          where: { id: userSession.userId },
          select: { 
            username: true, 
            person: { 
              select: { name: true } 
            } 
          }
        });

        const displayName = user?.person?.name || user?.username || 'Staff';

        return NextResponse.json({
          role: 'STAFF',
          displayName: displayName
        });
      }
    }

    // No valid session found
    return NextResponse.json(
      { role: 'GUEST', displayName: 'Invitado' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    return NextResponse.json(
      { role: 'GUEST', displayName: 'Invitado' },
      { status: 500 }
    );
  }
}