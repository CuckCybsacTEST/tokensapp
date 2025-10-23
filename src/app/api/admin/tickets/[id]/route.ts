import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const body = await request.json();
    const { showId, name, description, price, capacity } = body;

    // Validaciones
    if (!name || price === undefined || capacity === undefined) {
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

    // Verificar que el ticket existe
    const existingTicket = await prisma.ticketType.findUnique({
      where: { id: ticketId },
      include: { show: { select: { startsAt: true } } }
    });

    if (!existingTicket) {
      return NextResponse.json(
        { ok: false, error: 'Tipo de ticket no encontrado' },
        { status: 404 }
      );
    }

    // Si se cambió el showId, verificar que existe
    if (showId && showId !== existingTicket.showId) {
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
    }

    // Verificar que no se reduzca la capacidad por debajo de los tickets ya vendidos
    if (capacity < existingTicket.soldCount) {
      return NextResponse.json(
        { ok: false, error: `No puedes reducir la capacidad por debajo de ${existingTicket.soldCount} tickets vendidos` },
        { status: 400 }
      );
    }

    // Actualizar el ticket type
    const updatedTicket = await prisma.ticketType.update({
      where: { id: ticketId },
      data: {
        ...(showId && { showId }),
        name,
        description: description || null,
        price,
        capacity,
        // Si cambió el show, actualizar availableTo
        ...(showId && showId !== existingTicket.showId && {
          availableTo: new Date() // Se actualizará con la nueva fecha del show
        })
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

    // Si cambió el show, actualizar availableTo con la nueva fecha
    if (showId && showId !== existingTicket.showId) {
      await prisma.ticketType.update({
        where: { id: ticketId },
        data: {
          availableTo: updatedTicket.show.startsAt
        }
      });
    }

    const formattedTicket = {
      id: updatedTicket.id,
      showId: updatedTicket.show.id,
      showTitle: updatedTicket.show.title,
      name: updatedTicket.name,
      description: updatedTicket.description,
      price: Number(updatedTicket.price),
      capacity: updatedTicket.capacity,
      soldCount: updatedTicket.soldCount,
      availableFrom: updatedTicket.availableFrom?.toISOString(),
      availableTo: updatedTicket.availableTo?.toISOString(),
      createdAt: updatedTicket.createdAt.toISOString(),
      updatedAt: updatedTicket.updatedAt.toISOString()
    };

    return NextResponse.json({
      ok: true,
      ticketType: formattedTicket
    });

  } catch (error) {
    console.error('Error updating ticket type:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;

    // Verificar que el ticket existe y no tiene ventas
    const ticket = await prisma.ticketType.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        soldCount: true,
        name: true
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: 'Tipo de ticket no encontrado' },
        { status: 404 }
      );
    }

    if (ticket.soldCount > 0) {
      return NextResponse.json(
        { ok: false, error: `No puedes eliminar "${ticket.name}" porque ya tiene ${ticket.soldCount} tickets vendidos` },
        { status: 400 }
      );
    }

    // Eliminar el ticket type
    await prisma.ticketType.delete({
      where: { id: ticketId }
    });

    return NextResponse.json({
      ok: true,
      message: 'Tipo de ticket eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error deleting ticket type:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}