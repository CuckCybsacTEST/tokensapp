import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitSocketEvent } from '@/lib/socket';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;

    // Primero intentar encontrar si es un ticket individual
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketPurchase: {
          include: {
            tickets: true,
            ticketType: {
              include: {
                show: true
              }
            }
          }
        }
      }
    });

    if (ticket) {
      // Es un ticket individual
      const purchase = ticket.ticketPurchase;

      // Solo permitir cancelar compras confirmadas o sospechosas
      if ((purchase.status as any) !== 'CONFIRMED' && (purchase.status as any) !== 'SUSPICIOUS') {
        return NextResponse.json(
          { ok: false, error: 'Solo se pueden cancelar compras confirmadas o sospechosas' },
          { status: 400 }
        );
      }

      // Verificar que el show no haya pasado
      const now = new Date();
      if (purchase.ticketType.show.startsAt <= now) {
        return NextResponse.json(
          { ok: false, error: 'No se pueden cancelar tickets de shows que ya pasaron' },
          { status: 400 }
        );
      }

      // Cancelar la compra y todos los tickets asociados
      await prisma.$transaction(async (tx) => {
        // Cancelar todos los tickets individuales
        await tx.ticket.updateMany({
          where: { ticketPurchaseId: purchase.id },
          data: { status: 'CANCELLED' }
        });

        // Cancelar la compra
        await tx.ticketPurchase.update({
          where: { id: purchase.id },
          data: { status: 'CANCELLED' }
        });
      });

      // Emitir evento de socket para actualización en tiempo real
      emitSocketEvent('ticket-status-changed', {
        ticketPurchaseId: purchase.id,
        status: 'CANCELLED',
        action: 'cancelled'
      }, ['staff-general']);

      return NextResponse.json({
        ok: true,
        message: 'Ticket cancelado exitosamente'
      });
    }

    // Si no es un ticket individual, intentar como ticketPurchase
    const purchase = await prisma.ticketPurchase.findUnique({
      where: { id: ticketId },
      include: {
        tickets: true,
        ticketType: {
          include: {
            show: true
          }
        }
      }
    });

    if (!purchase) {
      return NextResponse.json(
        { ok: false, error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Solo permitir cancelar compras confirmadas o sospechosas
    if ((purchase.status as any) !== 'CONFIRMED' && (purchase.status as any) !== 'SUSPICIOUS') {
      return NextResponse.json(
        { ok: false, error: 'Solo se pueden cancelar compras confirmadas o sospechosas' },
        { status: 400 }
      );
    }

    // Verificar que el show no haya pasado
    const now = new Date();
    if (purchase.ticketType.show.startsAt <= now) {
      return NextResponse.json(
        { ok: false, error: 'No se pueden cancelar tickets de shows que ya pasaron' },
        { status: 400 }
      );
    }

    // Cancelar la compra y todos los tickets asociados
    await prisma.$transaction(async (tx) => {
      // Cancelar todos los tickets individuales (si existen)
      await tx.ticket.updateMany({
        where: { ticketPurchaseId: purchase.id },
        data: { status: 'CANCELLED' }
      });

      // Cancelar la compra
      await tx.ticketPurchase.update({
        where: { id: purchase.id },
        data: { status: 'CANCELLED' }
      });
    });

    // Emitir evento de socket para actualización en tiempo real
    emitSocketEvent('ticket-status-changed', {
      ticketPurchaseId: purchase.id,
      status: 'CANCELLED',
      action: 'cancelled'
    }, ['staff-general']);

    return NextResponse.json({
      ok: true,
      message: 'Ticket cancelado exitosamente'
    });

  } catch (error) {
    console.error('Error canceling ticket:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}