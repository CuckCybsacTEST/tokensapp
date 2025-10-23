import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitSocketEvent } from '../../../../lib/socket';

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
        ticketPurchase: true
      }
    });

    if (ticket) {
      // Es un ticket individual
      const purchase = ticket.ticketPurchase;

      // Solo permitir marcar como sospechoso compras confirmadas
      if (purchase.status !== 'CONFIRMED') {
        return NextResponse.json(
          { ok: false, error: 'Solo se pueden marcar como sospechosas compras confirmadas' },
          { status: 400 }
        );
      }

      // Marcar la compra como sospechosa
      await prisma.ticketPurchase.update({
        where: { id: purchase.id },
        data: { status: 'SUSPICIOUS' }
      });

      // Emitir evento de socket para actualización en tiempo real
      emitSocketEvent('ticket-status-changed', {
        ticketPurchaseId: purchase.id,
        status: 'SUSPICIOUS',
        action: 'marked-suspicious'
      }, ['staff-general']);

      return NextResponse.json({
        ok: true,
        message: 'Ticket marcado como sospechoso exitosamente'
      });
    }

    // Si no es un ticket individual, intentar como ticketPurchase
    const purchase = await prisma.ticketPurchase.findUnique({
      where: { id: ticketId }
    });

    if (!purchase) {
      return NextResponse.json(
        { ok: false, error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Solo permitir marcar como sospechoso compras confirmadas
    if (purchase.status !== 'CONFIRMED') {
      return NextResponse.json(
        { ok: false, error: 'Solo se pueden marcar como sospechosas compras confirmadas' },
        { status: 400 }
      );
    }

    // Marcar la compra como sospechosa
    await prisma.ticketPurchase.update({
      where: { id: purchase.id },
      data: { status: 'SUSPICIOUS' }
    });

    // Emitir evento de socket para actualización en tiempo real
    emitSocketEvent('ticket-status-changed', {
      ticketPurchaseId: purchase.id,
      status: 'SUSPICIOUS',
      action: 'marked-suspicious'
    }, ['staff-general']);

    return NextResponse.json({
      ok: true,
      message: 'Ticket marcado como sospechoso exitosamente'
    });

  } catch (error) {
    console.error('Error marking ticket as suspicious:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}