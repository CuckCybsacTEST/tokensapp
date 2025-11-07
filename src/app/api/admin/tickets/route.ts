import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const ticketTypes = await prisma.ticketType.findMany({
      include: {
        show: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            status: true
          }
        }
      },
      orderBy: [
        { show: { startsAt: 'desc' } },
        { createdAt: 'asc' }
      ]
    });

    const formattedTickets = ticketTypes.map(ticket => ({
      id: ticket.id,
      showId: ticket.show.id,
      showTitle: ticket.show.title,
      name: ticket.name,
      description: ticket.description,
      price: Number(ticket.price),
      capacity: ticket.capacity,
      soldCount: ticket.soldCount,
      availableFrom: ticket.availableFrom?.toISOString(),
      availableTo: ticket.availableTo?.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString()
    }));

    return NextResponse.json({
      ok: true,
      ticketTypes: formattedTickets
    });

  } catch (error) {
    console.error('Error fetching ticket types:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { showId, name, description, price, capacity } = body;

    // Validaciones
    if (!showId || !name || price === undefined || capacity === undefined) {
      return NextResponse.json(
        { ok: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (price < 0 || capacity < 1) {
      return NextResponse.json(
        { ok: false, error: 'Precio debe ser >= 0 y capacidad >= 1' },
        { status: 400 }
      );
    }

    // Verificar que el show existe y está publicado
    const show = await prisma.show.findUnique({
      where: { id: showId },
      select: { id: true, status: true, startsAt: true }
    });

    if (!show || show.status !== 'PUBLISHED') {
      return NextResponse.json(
        { ok: false, error: 'Show no encontrado o no publicado' },
        { status: 404 }
      );
    }

    // Crear el ticket type
    const ticketType = await prisma.ticketType.create({
      data: {
        showId,
        name,
        description: description || null,
        price,
        capacity,
        availableFrom: new Date(), // Disponible desde ahora
        availableTo: show.startsAt // Hasta el inicio del show
      },
      include: {
        show: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            status: true
          }
        }
      }
    });

    const formattedTicket = {
      id: ticketType.id,
      showId: ticketType.show.id,
      showTitle: ticketType.show.title,
      name: ticketType.name,
      description: ticketType.description,
      price: Number(ticketType.price),
      capacity: ticketType.capacity,
      soldCount: ticketType.soldCount,
      availableFrom: ticketType.availableFrom?.toISOString(),
      availableTo: ticketType.availableTo?.toISOString(),
      createdAt: ticketType.createdAt.toISOString(),
      updatedAt: ticketType.updatedAt.toISOString()
    };

    return NextResponse.json({
      ok: true,
      ticketType: formattedTicket
    });

  } catch (error) {
    console.error('Error creating ticket type:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
