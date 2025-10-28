import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface MyTicketsRequest {
  dni: string;
  phone?: string; // Para verificación adicional
}

export async function POST(req: NextRequest) {
  try {
    const body: MyTicketsRequest = await req.json();
    const { dni, phone } = body;

    // Validar DNI
    if (!dni?.trim()) {
      return NextResponse.json(
        { error: 'DNI es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de DNI
    const dniRegex = /^\d{8}$/;
    if (!dniRegex.test(dni.trim())) {
      return NextResponse.json(
        { error: 'El DNI debe tener exactamente 8 dígitos numéricos' },
        { status: 400 }
      );
    }

    // Buscar tickets por DNI
    const tickets = await prisma.ticket.findMany({
      where: {
        customerDni: dni.trim(),
        ticketPurchase: {
          status: {
            in: ['CONFIRMED', 'PENDING'] // Solo compras confirmadas o pendientes
          }
        }
      },
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
                status: true,
                imageWebpPath: true
              }
            }
          }
        },
        ticketPurchase: {
          select: {
            id: true,
            purchasedAt: true,
            status: true,
            totalAmount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Si se proporcionó teléfono, verificar que coincida con al menos uno de los tickets
    if (phone?.trim()) {
      const hasMatchingPhone = tickets.some(ticket =>
        ticket.customerPhone.replace(/\s+/g, '') === phone.trim().replace(/\s+/g, '')
      );

      if (!hasMatchingPhone) {
        return NextResponse.json(
          { error: 'No se encontraron tickets con ese DNI y teléfono' },
          { status: 404 }
        );
      }
    }

    if (tickets.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron tickets con ese DNI' },
        { status: 404 }
      );
    }

    // Preparar respuesta
    const response = {
      customerDni: dni.trim(),
      totalTickets: tickets.length,
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        qrDataUrl: ticket.qrDataUrl, // El QR para mostrar/descargar
        status: ticket.status,
        createdAt: ticket.createdAt,
        usedAt: ticket.usedAt,
        ticketType: {
          name: ticket.ticketType.name,
          price: ticket.ticketType.price
        },
        show: {
          id: ticket.ticketType.show.id,
          title: ticket.ticketType.show.title,
          slug: ticket.ticketType.show.slug,
          startsAt: ticket.ticketType.show.startsAt,
          endsAt: ticket.ticketType.show.endsAt,
          status: ticket.ticketType.show.status,
          imageWebpPath: ticket.ticketType.show.imageWebpPath
        },
        purchase: {
          id: ticket.ticketPurchase.id,
          purchasedAt: ticket.ticketPurchase.purchasedAt,
          status: ticket.ticketPurchase.status,
          totalAmount: ticket.ticketPurchase.totalAmount
        }
      }))
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching user tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// También permitir GET con query parameters para compatibilidad
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dni = searchParams.get('dni');
    const phone = searchParams.get('phone');

    if (!dni) {
      return NextResponse.json(
        { error: 'Parámetro dni es requerido' },
        { status: 400 }
      );
    }

    // Reutilizar la lógica del POST
    const mockReq = new NextRequest(req.url, {
      method: 'POST',
      body: JSON.stringify({ dni, phone }),
      headers: req.headers
    });

    return POST(mockReq);

  } catch (error: any) {
    console.error('Error fetching user tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}