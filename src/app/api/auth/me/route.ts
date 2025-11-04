import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie, SessionRole, getSessionCookieFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Obtener la cookie de sesión usando la función del auth
    const cookie = getSessionCookieFromRequest(request);

    if (!cookie) {
      return NextResponse.json(
        { role: 'GUEST', displayName: 'Invitado' },
        { status: 200 }
      );
    }

    // Verificar la sesión
    const session = await verifySessionCookie(cookie);

    if (!session) {
      return NextResponse.json(
        { role: 'GUEST', displayName: 'Invitado' },
        { status: 200 }
      );
    }

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
      role: session.role || 'ADMIN',
      displayName: roleDisplayNames[session.role || 'ADMIN']
    });

  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    return NextResponse.json(
      { role: 'GUEST', displayName: 'Invitado' },
      { status: 500 }
    );
  }
}