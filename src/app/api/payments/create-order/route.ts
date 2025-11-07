import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import culqi from '../../../../../lib/culqi';
import { isCulqiRealMode } from '@/lib/featureFlags';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, description, orderId } = await request.json();

    let order;

    if (isCulqiRealMode()) {
      // Modo real: usar Culqi
      order = await culqi().orders.createOrder({
        amount: Math.round(amount * 100), // Culqi espera centavos
        currency_code: currency || 'PEN',
        description: description,
        order_number: orderId,
        client_details: {
          first_name: 'Cliente',
          last_name: 'Tickets',
          email: 'cliente@tickets.com',
          phone_number: '+51999999999'
        },
        expiration_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
      });
    } else {
      // Modo demo: simular orden
      order = {
        id: `demo_order_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency_code: currency || 'PEN',
        description: description,
        order_number: orderId,
        state: 'pending',
        creation_date: Math.floor(Date.now() / 1000),
        expiration_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      };
    }    // Actualizar la compra con el ID de la orden de Culqi
    await prisma.ticketPurchase.update({
      where: {
        id: orderId,
      },
      data: {
        culqiOrderId: order.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      order: order,
      mode: isCulqiRealMode() ? 'real' : 'demo'
    });

  } catch (error: any) {
    console.error('Error creating Culqi order:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Error creando orden de pago' },
      { status: 500 }
    );
  }
}
