export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get('customer_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { ok: false, code: 'NO_SESSION' },
        { status: 401 }
      );
    }

    // Buscar sesión válida
    const session = await prisma.customerSession.findUnique({
      where: { sessionToken },
      include: {
        customer: {
          select: {
            id: true,
            dni: true,
            name: true,
            email: true,
            phone: true,
            whatsapp: true,
            birthday: true,
            membershipLevel: true,
            points: true,
            totalSpent: true,
            visitCount: true,
            lastVisit: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_SESSION' },
        { status: 401 }
      );
    }

    // Verificar si la sesión expiró
    if (session.expiresAt < new Date()) {
      // Limpiar sesión expirada
      await prisma.customerSession.delete({
        where: { id: session.id }
      });

      return NextResponse.json(
        { ok: false, code: 'SESSION_EXPIRED' },
        { status: 401 }
      );
    }

    // Actualizar lastActivity
    await prisma.customerSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() }
    });

    return NextResponse.json({
      ok: true,
      customer: session.customer,
      session: {
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity
      }
    });

  } catch (error) {
    console.error('Customer me error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}