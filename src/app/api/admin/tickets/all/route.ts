import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tickets = await (prisma as any).ticket.findMany({
      include: {
        ticketPurchase: {
          include: {
            ticketType: {
              include: {
                show: {
                  select: {
                    id: true,
                    title: true,
                    startsAt: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    const formattedTickets = tickets.map((ticket: any) => ({
      id: ticket.id,
      ticketPurchaseId: ticket.ticketPurchaseId,
      showTitle: ticket.ticketPurchase.ticketType.show.title,
      showDate: ticket.ticketPurchase.ticketType.show.startsAt.toISOString(),
      ticketType: ticket.ticketPurchase.ticketType.name,
      quantity: ticket.ticketPurchase.quantity,
      totalAmount: Number(ticket.ticketPurchase.totalAmount),
      status: ticket.status,
      purchasedAt: ticket.ticketPurchase.purchasedAt.toISOString(),
      customerName: ticket.customerName,
      customerDni: ticket.customerDni,
      customerPhone: ticket.customerPhone,
      qrCode: ticket.qrCode,
      qrDataUrl: ticket.qrDataUrl,
    }));

    return NextResponse.json({
      ok: true,
      tickets: formattedTickets
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}