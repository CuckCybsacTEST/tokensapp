import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Fetching ticket purchases...');

    // Verificar conexión a BD antes de hacer consultas
    try {
      await prisma.$connect();
      console.log('Database connection OK');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        { ok: false, error: 'Error de conexión a base de datos' },
        { status: 500 }
      );
    }

    // Obtener purchases con sus tickets individuales
    const purchases = await prisma.ticketPurchase.findMany({
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
        },
        tickets: {
          select: {
            id: true,
            qrCode: true,
            qrDataUrl: true,
            status: true,
            customerName: true,
            customerDni: true,
            customerPhone: true
          }
        }
      },
      orderBy: [
        { purchasedAt: 'desc' }
      ]
    });

    console.log(`Found ${purchases.length} purchases`);

    // Convertir purchases con tickets individuales a formato de tickets
    const formattedTickets = purchases.flatMap((purchase: any) => {
      try {
        console.log(`Processing purchase ${purchase.id} with ${purchase.tickets?.length || 0} tickets`);
        // Si la purchase tiene tickets, devolver cada ticket individual
        if (purchase.tickets && purchase.tickets.length > 0) {
          return purchase.tickets.map((ticket: any) => {
            // Determinar el status basado en la purchase y el ticket individual
            let displayStatus = 'VALID';
            if (purchase.status === 'CANCELLED') {
              displayStatus = 'CANCELLED';
            } else if (purchase.status === 'SUSPICIOUS') {
              displayStatus = 'SUSPICIOUS';
            } else if (purchase.status === 'CONFIRMED') {
              // Para purchases confirmadas, usar el status del ticket individual
              displayStatus = ticket.status === 'VALID' ? 'VALID' :
                             ticket.status === 'USED' ? 'USED' :
                             ticket.status === 'CANCELLED' ? 'CANCELLED' : 'VALID';
            }

            return {
              id: ticket.id,
              ticketPurchaseId: purchase.id,
              showTitle: purchase.ticketType?.show?.title || 'Show desconocido',
              showDate: purchase.ticketType?.show?.startsAt?.toISOString() || new Date().toISOString(),
              ticketType: purchase.ticketType?.name || 'Tipo desconocido',
              quantity: 1, // Cada ticket individual cuenta como 1
              totalAmount: purchase.tickets.length > 0 ? Number(purchase.totalAmount) / purchase.tickets.length : Number(purchase.totalAmount),
              status: displayStatus,
              purchasedAt: purchase.purchasedAt.toISOString(),
              customerName: ticket.customerName || purchase.customerName || '',
              customerDni: ticket.customerDni || purchase.customerDni || '',
              customerPhone: ticket.customerPhone || purchase.customerPhone || '',
              qrCode: ticket.qrCode || '',
              qrDataUrl: ticket.qrDataUrl || '',
            };
          });
        } else {
          // Si la purchase no tiene tickets (compra reciente sin procesar), mostrar info básica
          let displayStatus = 'PENDING';
          if (purchase.status === 'CONFIRMED') {
            displayStatus = 'VALID';
          } else if (purchase.status === 'CANCELLED') {
            displayStatus = 'CANCELLED';
          } else if (purchase.status === 'SUSPICIOUS') {
            displayStatus = 'SUSPICIOUS';
          }

          return [{
            id: purchase.id,
            ticketPurchaseId: purchase.id,
            showTitle: purchase.ticketType?.show?.title || 'Show desconocido',
            showDate: purchase.ticketType?.show?.startsAt?.toISOString() || new Date().toISOString(),
            ticketType: purchase.ticketType?.name || 'Tipo desconocido',
            quantity: purchase.quantity || 1,
            totalAmount: Number(purchase.totalAmount) || 0,
            status: displayStatus,
            purchasedAt: purchase.purchasedAt.toISOString(),
            customerName: purchase.customerName || '',
            customerDni: purchase.customerDni || '',
            customerPhone: purchase.customerPhone || '',
            qrCode: '', // No hay QR aún
            qrDataUrl: '', // No hay QR aún
          }];
        }
      } catch (error) {
        console.error('Error processing purchase:', purchase.id, error);
        // Devolver un ticket básico en caso de error
        return [{
          id: purchase.id,
          ticketPurchaseId: purchase.id,
          showTitle: 'Error al cargar',
          showDate: new Date().toISOString(),
          ticketType: 'Error',
          quantity: 1,
          totalAmount: 0,
          status: 'PENDING',
          purchasedAt: purchase.purchasedAt?.toISOString() || new Date().toISOString(),
          customerName: purchase.customerName || 'Error',
          customerDni: '',
          customerPhone: '',
          qrCode: '',
          qrDataUrl: '',
        }];
      }
    });

    console.log(`Returning ${formattedTickets.length} formatted tickets`);

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
