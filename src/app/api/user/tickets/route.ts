import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación del usuario
    const cookie = req.headers.get('cookie');
    if (!cookie) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const session = await verifyUserSessionCookie(cookie);
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión inválida' },
        { status: 401 }
      );
    }

    // Obtener todas las compras del usuario con detalles del show y tipo de ticket
    const purchases = await prisma.ticketPurchase.findMany({
      where: {
        userId: session.userId,
        status: {
          in: ['CONFIRMED', 'PENDING'] // Incluir confirmadas y pendientes
        }
      },
      include: {
        ticketType: {
          include: {
            show: {
              select: {
                id: true,
                title: true,
                startsAt: true,
                imageWebpPath: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    });

    // Formatear la respuesta
    const tickets = purchases.map(purchase => ({
      id: purchase.id,
      purchaseId: purchase.id,
      showId: purchase.ticketType.show.id,
      showTitle: purchase.ticketType.show.title,
      showDate: purchase.ticketType.show.startsAt,
      showPoster: purchase.ticketType.show.imageWebpPath,
      showStatus: purchase.ticketType.show.status,
      ticketType: purchase.ticketType.name,
      quantity: purchase.quantity,
      totalAmount: purchase.totalAmount,
      status: purchase.status,
      purchasedAt: purchase.purchasedAt,
      // Calcular si el ticket es válido (show no ha pasado)
      isValid: purchase.ticketType.show.startsAt > new Date()
    }));

    return NextResponse.json({
      ok: true,
      tickets
    });

  } catch (error: any) {
    console.error('Error fetching user tickets:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
