import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUserSessionCookie } from '@/lib/auth-user';

interface TicketQueryParams {
  includeQR?: boolean; // Para usuarios finales, no incluir datos sensibles del QR
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const { searchParams } = new URL(req.url);
    const includeQR = searchParams.get('includeQR') === 'true';

    // Verificar autenticación
    const cookie = req.headers.get('cookie');
    let userRole: string | null = null;

    if (cookie) {
      try {
        const session = await verifyUserSessionCookie(cookie);
        if (session) {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { role: true }
          });
          userRole = user?.role || null;
        }
      } catch (error) {
        // Usuario no autenticado, continuar como acceso público limitado
      }
    }

    // Buscar el ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketType: {
          include: {
            show: {
              select: {
                id: true,
                title: true,
                slug: true,
                startsAt: true,
                endsAt: true,
                status: true
              }
            }
          }
        },
        ticketPurchase: {
          select: {
            id: true,
            purchasedAt: true,
            status: true,
            customerEmail: true,
            customerDni: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Determinar qué información mostrar basado en permisos
    const isStaffOrAdmin = userRole && ['ADMIN', 'STAFF'].includes(userRole);
    const isOwner = ticket.ticketPurchase.customerDni === searchParams.get('dni');

    // Si no es staff/admin ni el propietario, denegar acceso
    if (!isStaffOrAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver este ticket' },
        { status: 403 }
      );
    }

    // Preparar respuesta
    const response: any = {
      id: ticket.id,
      customerName: ticket.customerName,
      customerDni: ticket.customerDni,
      customerPhone: ticket.customerPhone,
      status: ticket.status,
      createdAt: ticket.createdAt,
      usedAt: ticket.usedAt,
      ticketType: {
        id: ticket.ticketType.id,
        name: ticket.ticketType.name,
        price: ticket.ticketType.price
      },
      show: ticket.ticketType.show,
      purchase: {
        id: ticket.ticketPurchase.id,
        purchasedAt: ticket.ticketPurchase.purchasedAt,
        status: ticket.ticketPurchase.status
      }
    };

    // Solo incluir QR data para staff/admin o si se solicita explícitamente
    if (includeQR && (isStaffOrAdmin || isOwner)) {
      response.qrCode = ticket.qrCode;
      response.qrDataUrl = ticket.qrDataUrl;
    }

    // Agregar información adicional para staff
    if (isStaffOrAdmin) {
      response.ticketPurchaseId = ticket.ticketPurchaseId;
      response.ticketTypeId = ticket.ticketTypeId;
      response.showId = ticket.ticketType.show.id;
      response.customerEmail = ticket.ticketPurchase.customerEmail;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}