import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { signToken } from '@/lib/signing';
import { generateQrPngDataUrl } from '@/lib/qr';
import { isCulqiRealMode } from '@/lib/featureFlags';

const prisma = new PrismaClient();

// Función para generar tickets individuales con QRs
async function generateTicketsWithQRs(purchase: any) {
  try {
    console.log(`Generando ${purchase.quantity} tickets con QRs para la compra ${purchase.id}`);

    const tickets = [];

    // Generar un ticket por cada unidad comprada
    for (let i = 0; i < purchase.quantity; i++) {
      // Generar código único para el QR (ticket específico)
      const ticketId = `${purchase.id}_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const qrCode = `TICKET_${ticketId}`;

      // Generar imagen QR como DataURL
      const qrDataUrl = await generateQrPngDataUrl(qrCode);

      // Crear ticket individual
      const ticket = await prisma.ticket.create({
        data: {
          ticketPurchaseId: purchase.id,
          ticketTypeId: purchase.ticketTypeId,
          qrCode,
          qrDataUrl,
          customerDni: purchase.customerDni,
          customerName: purchase.customerName,
          customerPhone: purchase.customerPhone,
          status: 'VALID',
        },
      });

      tickets.push(ticket);
    }

    console.log(`Generados ${tickets.length} tickets con QRs para la compra ${purchase.id}`);

    // TODO: Enviar tickets por WhatsApp/email
    // await sendTicketsByWhatsApp(purchase, tickets);

    return tickets;
  } catch (error) {
    console.error('Error generando tickets con QRs:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verificar que el webhook viene de Culqi (en producción usarías la firma)
    // Por ahora aceptamos todos los webhooks para desarrollo

    console.log('Webhook recibido:', body);

    const { event_type, data } = body;

    if (event_type === 'order.status.changed') {
      const order = data;

      // Buscar la compra asociada con esta orden
      const purchase = await prisma.ticketPurchase.findFirst({
        where: {
          culqiOrderId: order.id,
        },
      });

      if (!purchase) {
        console.error('Compra no encontrada para orden:', order.id);
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
      }

      // Actualizar el estado del pago según el estado de la orden
      let paymentStatus = 'pending';

      switch (order.status) {
        case 'paid':
          paymentStatus = 'completed';
          break;
        case 'expired':
          paymentStatus = 'expired';
          break;
        case 'cancelled':
          paymentStatus = 'cancelled';
          break;
        default:
          paymentStatus = 'pending';
      }

      // Actualizar la compra con el nuevo estado
      await prisma.ticketPurchase.update({
        where: {
          id: purchase.id,
        },
        data: {
          paymentStatus,
          updatedAt: new Date(),
        },
      });

      console.log(`Pago actualizado: ${purchase.id} - Estado: ${paymentStatus}`);

      // Si el pago se completó, generar QRs para los tickets
      if (paymentStatus === 'completed') {
        await generateTicketsWithQRs(purchase);
      }

      // Aquí podrías enviar notificaciones por WhatsApp/email si es necesario
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}