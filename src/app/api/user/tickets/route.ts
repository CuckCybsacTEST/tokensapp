import { NextRequest, NextResponse } from 'next/server';
import { getTicketPurchasesForUser } from '@/lib/tickets/service';
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

    // Obtener todas las compras del usuario con detalles del show y tipo de ticket usando Supabase
    const purchases = await getTicketPurchasesForUser(session.userId);

    // Filtrar solo confirmadas y pendientes
    const filteredPurchases = purchases.filter(purchase =>
      purchase.status === 'CONFIRMED' || purchase.status === 'PENDING'
    );

    // Formatear la respuesta
    const tickets = filteredPurchases.map(purchase => ({
      id: purchase.id,
      purchaseId: purchase.id,
      showId: purchase.ticketType?.show?.id,
      showTitle: purchase.ticketType?.show?.title,
      showDate: purchase.ticketType?.show?.startsAt,
      showPoster: purchase.ticketType?.show?.imageWebpPath,
      showStatus: purchase.ticketType?.show?.status,
      ticketType: purchase.ticketType?.name,
      quantity: purchase.quantity,
      totalAmount: purchase.totalAmount,
      status: purchase.status,
      purchasedAt: purchase.purchasedAt,
      // Calcular si el ticket es válido (show no ha pasado)
      isValid: purchase.ticketType?.show?.startsAt ? new Date(purchase.ticketType.show.startsAt) > new Date() : false
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
