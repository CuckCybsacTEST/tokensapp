import { NextRequest, NextResponse } from 'next/server';
import { verifyUserSessionCookie, getUserSessionCookieFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Only check user session (unified system)
    const userCookie = getUserSessionCookieFromRequest(request);
    if (userCookie) {
      const userSession = await verifyUserSessionCookie(userCookie);
      if (userSession) {
        // Get user details from database
        const user = await prisma.user.findUnique({
          where: { id: userSession.userId },
          select: {
            username: true,
            role: true,
            person: {
              select: { name: true }
            }
          }
        });

        if (user) {
          const displayName = user.person?.name || user.username || 'Usuario';

          return NextResponse.json({
            role: user.role,
            displayName: displayName
          });
        }
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
