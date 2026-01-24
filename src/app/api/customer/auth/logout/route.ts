export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get('customer_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { ok: true }, // No hay sesión para cerrar, pero es OK
        { status: 200 }
      );
    }

    // Eliminar sesión de la base de datos
    await prisma.customerSession.deleteMany({
      where: { sessionToken }
    });

    // Crear respuesta que elimina la cookie
    const response = NextResponse.json({ ok: true });

    response.cookies.set('customer_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expira inmediatamente
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Customer logout error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}