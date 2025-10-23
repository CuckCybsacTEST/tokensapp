import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const showId = params.id;

    // Verificar que el show existe y está publicado
    const show = await prisma.show.findUnique({
      where: { id: showId },
      select: { id: true, status: true, startsAt: true }
    });

    if (!show || show.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Show not found or not available' },
        { status: 404 }
      );
    }

    // Obtener tipos de tickets disponibles para este show
    const ticketTypes = await prisma.ticketType.findMany({
      where: {
        showId,
        // Solo tickets que están disponibles actualmente
        OR: [
          { availableFrom: null, availableTo: null },
          { availableFrom: { lte: new Date() }, availableTo: null },
          { availableFrom: null, availableTo: { gte: new Date() } },
          { availableFrom: { lte: new Date() }, availableTo: { gte: new Date() } }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calcular disponibilidad para cada tipo de ticket
    const ticketTypesWithAvailability = ticketTypes.map(ticket => ({
      id: ticket.id,
      name: ticket.name,
      description: ticket.description,
      price: Number(ticket.price), // Convertir Decimal a número
      capacity: ticket.capacity,
      soldCount: ticket.soldCount,
      availableCount: Math.max(0, ticket.capacity - ticket.soldCount),
      availableFrom: ticket.availableFrom?.toISOString(),
      availableTo: ticket.availableTo?.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      ticketTypes: ticketTypesWithAvailability
    });

  } catch (error) {
    console.error('Error fetching ticket types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}