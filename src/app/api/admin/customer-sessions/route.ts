import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación de admin
    const rawCookie = getUserSessionCookieFromRequest(req);
    const session = await verifySessionCookie(rawCookie);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (customerId) {
      // Obtener sesiones de un cliente específico
      const sessions = await prisma.customerSession.findMany({
        where: {
          customerId,
          expiresAt: { gt: new Date() }
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              dni: true
            }
          }
        },
        orderBy: { lastActivity: 'desc' }
      });

      return NextResponse.json(sessions);
    } else {
      // Obtener todas las sesiones activas
      const sessions = await prisma.customerSession.findMany({
        where: {
          expiresAt: { gt: new Date() }
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              dni: true
            }
          }
        },
        orderBy: { lastActivity: 'desc' }
      });

      return NextResponse.json(sessions);
    }
  } catch (error) {
    console.error('Error fetching customer sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Verificar autenticación de admin
    const rawCookie = getUserSessionCookieFromRequest(req);
    const session = await verifySessionCookie(rawCookie);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Eliminar la sesión específica
    await prisma.customerSession.delete({
      where: { id: sessionId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}