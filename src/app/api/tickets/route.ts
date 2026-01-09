import { NextRequest, NextResponse } from 'next/server';
import { getTicketPurchasesForUser } from '@/lib/tickets/service';
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

    // Obtener tickets del usuario usando Supabase
    const ticketPurchases = await getTicketPurchasesForUser(userId);

    // Formatear respuesta
    const formattedTickets = ticketPurchases.flatMap(purchase =>
      (purchase.tickets || []).map((ticket: any) => ({
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
          id: purchase.ticketType?.show?.id,
          title: purchase.ticketType?.show?.title,
          date: purchase.ticketType?.show?.startsAt,
          slug: purchase.ticketType?.show?.slug
        },
        ticketType: {
          id: purchase.ticketType?.id,
          name: purchase.ticketType?.name,
          price: purchase.ticketType?.price
        },
        purchase: {
          id: purchase.id,
          totalAmount: purchase.totalAmount,
          purchasedAt: purchase.purchasedAt,
          paymentStatus: purchase.paymentStatus
        }
      }))
    );

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
