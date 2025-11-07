import { NextRequest, NextResponse } from 'next/server';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const logs: string[] = [];

  try {
    const raw = getUserSessionCookieFromRequest(request);

    logs.push('=== DEBUG SESSION (Server-side) ===');
    logs.push('Raw cookie:', raw ? 'present' : 'null');

    if (raw) {
      const session = await verifyUserSessionCookie(raw);
      logs.push('Session verification result:', session ? 'valid' : 'invalid');

      if (session) {
        logs.push('Session details:', JSON.stringify({
          userId: session.userId,
          role: session.role,
          iat: new Date(session.iat).toISOString(),
          exp: new Date(session.exp).toISOString(),
          isExpired: Date.now() > session.exp
        }, null, 2));

        return NextResponse.json({
          hasCookie: true,
          sessionValid: true,
          userId: session.userId,
          role: session.role,
          issuedAt: new Date(session.iat).toISOString(),
          expiresAt: new Date(session.exp).toISOString(),
          isExpired: Date.now() > session.exp,
          timeUntilExpiry: Math.max(0, session.exp - Date.now()) / 1000 / 60, // minutes
          canAccessAdmin: session.role === 'ADMIN',
          logs
        });
      } else {
        logs.push('Session verification failed');
        return NextResponse.json({
          hasCookie: true,
          sessionValid: false,
          canAccessAdmin: false,
          logs
        });
      }
    } else {
      logs.push('No cookie found');
      return NextResponse.json({
        hasCookie: false,
        sessionValid: false,
        canAccessAdmin: false,
        logs
      });
    }
  } catch (error) {
    logs.push('Error in debug session:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      logs
    }, { status: 500 });
  }
}