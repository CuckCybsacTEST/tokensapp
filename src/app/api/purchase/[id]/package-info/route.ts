import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const purchaseId = params.id;

    // Buscar el paquete de tickets por el ID de compra
    const ticketPackage = await prisma.ticketPackage.findFirst({
      where: {
        ticketPurchase: {
          id: purchaseId
        }
      },
      include: {
        ticketPurchase: {
          include: {
            ticketType: {
              include: {
                show: true
              }
            }
          }
        }
      }
    });

    if (!ticketPackage) {
      return NextResponse.json(
        { error: 'Paquete de tickets no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      qrCode: ticketPackage.qrCode,
      totalTickets: ticketPackage.totalTickets,
      usedTickets: ticketPackage.usedTickets,
      remainingTickets: ticketPackage.totalTickets - ticketPackage.usedTickets,
      customerName: ticketPackage.customerName,
      customerDni: ticketPackage.customerDni,
      ticketTypeName: ticketPackage.ticketPurchase.ticketType.name,
      showTitle: ticketPackage.ticketPurchase.ticketType.show.title,
      showDate: ticketPackage.ticketPurchase.ticketType.show.startsAt,
      status: ticketPackage.status
    });

  } catch (error: any) {
    console.error('Error getting package info:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}