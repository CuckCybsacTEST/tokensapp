import { NextRequest, NextResponse } from 'next/server';
import { verifyUserSessionCookie, getUserSessionCookieFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  console.log('[api/auth/me] Request received');
  try {
    // Only check user session (unified system)
    const userCookie = getUserSessionCookieFromRequest(request);
    console.log('[api/auth/me] User cookie:', userCookie ? 'present' : 'null');
    if (userCookie) {
      const userSession = await verifyUserSessionCookie(userCookie);
      console.log('[api/auth/me] User session:', userSession ? 'valid' : 'invalid');
      if (userSession) {
        // Get user details from database
        console.log('[api/auth/me] Fetching user from DB for userId:', userSession.userId);
        const user = await prisma.user.findUnique({
          where: { id: userSession.userId },
          select: {
            username: true,
            role: true,
            person: {
              select: { 
                name: true,
                dni: true,
                area: true,
                jobTitle: true,
                code: true
              }
            }
          }
        });
        console.log('[api/auth/me] DB result:', user ? 'found' : 'not found');

        if (user) {
          const displayName = user.person?.name || user.username || 'Usuario';
          console.log('[api/auth/me] Returning user data');

          return NextResponse.json({
            role: user.role,
            displayName: displayName,
            dni: user.person?.dni || null,
            area: user.person?.area || null,
            jobTitle: user.person?.jobTitle || null,
            code: user.person?.code || null
          });
        }
      }
    }

    console.log('[api/auth/me] No valid session, returning guest');
    // No valid session found
    return NextResponse.json(
      { role: 'GUEST', displayName: 'Invitado' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/auth/me] Error:', error);
    return NextResponse.json(
      { role: 'GUEST', displayName: 'Invitado' },
      { status: 500 }
    );
  }
}
    console.error('Error en /api/auth/me:', error);
    return NextResponse.json(
      { role: 'GUEST', displayName: 'Invitado' },
      { status: 500 }
    );
  }
}
