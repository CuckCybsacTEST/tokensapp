import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import culqi from '../../../../../lib/culqi';
import { isCulqiRealMode } from '@/lib/featureFlags';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  let purchaseId: string | undefined;

  try {
    const { token, orderId, purchaseId: pid, amount } = await request.json();
    purchaseId = pid;

    let charge;

    if (isCulqiRealMode()) {
      // Modo real: procesar cargo con Culqi
      charge = await culqi().charges.createCharge({
        amount: Math.round(amount * 100).toString(), // en centavos como string
        currency_code: 'PEN',
        email: 'cliente@tickets.com', // En producción usar el email del cliente
        source_id: token,
      });
    } else {
      // Modo demo: simular cargo exitoso
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay de procesamiento

      charge = {
        id: `demo_charge_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency_code: 'PEN',
        email: 'cliente@tickets.com',
        source_id: token,
        outcome: { type: 'venta_exitosa', code: '000' },
        creation_date: Math.floor(Date.now() / 1000),
        state: 'paid'
      };
    }

    // Actualizar el estado del pago en la base de datos
    await prisma.ticketPurchase.update({
      where: {
        id: purchaseId,
      },
      data: {
        paymentStatus: 'completed' as const,
        paymentId: charge.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      charge: charge,
      mode: isCulqiRealMode() ? 'real' : 'demo'
    });

  } catch (error: any) {
    console.error('Error processing charge:', error);

    // Si hay error, marcar el pago como fallido
    if (purchaseId) {
      try {
        await prisma.ticketPurchase.update({
          where: {
            id: purchaseId,
          },
          data: {
            paymentStatus: 'failed' as const,
            updatedAt: new Date(),
          },
        });
      } catch (dbError) {
        console.error('Error updating payment status:', dbError);
      }
    }

    return NextResponse.json(
      { ok: false, error: error.message || 'Error procesando el pago' },
      { status: 500 }
    );
  }
}