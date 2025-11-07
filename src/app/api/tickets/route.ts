import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión del usuario
    let userId: string | null = null;
    try {
      const cookie = request.headers.get('cookie');
      if (cookie) {
        const session = await verifyUserSessionCookie(cookie);
        userId = session?.userId || null;
      }
    } catch (error) {
      // Usuario no autenticado
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Obtener tickets del usuario
    const tickets = await prisma.ticket.findMany({
      where: {
        ticketPurchase: {
          userId: userId
        }
      },
      include: {
        ticketPurchase: {
          include: {
            ticketType: {
              include: {
                show: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatear respuesta
    const formattedTickets = tickets.map(ticket => ({
      id: ticket.id,
      qrCode: ticket.qrCode,
      qrDataUrl: ticket.qrDataUrl,
      status: ticket.status,
      customerName: ticket.customerName,
      customerDni: ticket.customerDni,
      customerPhone: ticket.customerPhone,
      createdAt: ticket.createdAt,
      usedAt: ticket.usedAt,
      show: {
        id: ticket.ticketPurchase.ticketType.show.id,
        title: ticket.ticketPurchase.ticketType.show.title,
        date: ticket.ticketPurchase.ticketType.show.startsAt,
        slug: ticket.ticketPurchase.ticketType.show.slug
      },
      ticketType: {
        id: ticket.ticketPurchase.ticketType.id,
        name: ticket.ticketPurchase.ticketType.name,
        price: ticket.ticketPurchase.ticketType.price
      },
      purchase: {
        id: ticket.ticketPurchase.id,
        totalAmount: ticket.ticketPurchase.totalAmount,
        purchasedAt: ticket.ticketPurchase.purchasedAt,
        paymentStatus: ticket.ticketPurchase.paymentStatus
      }
    }));

    return NextResponse.json({
      success: true,
      tickets: formattedTickets
    });

  } catch (error) {
    console.error('Error obteniendo tickets:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
