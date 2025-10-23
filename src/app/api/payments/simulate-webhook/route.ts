import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId es requerido' },
        { status: 400 }
      );
    }

    // Buscar la compra por el ID de orden
    const purchase = await prisma.ticketPurchase.findFirst({
      where: {
        culqiOrderId: orderId,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      );
    }

    // Simular webhook de pago exitoso
    await prisma.ticketPurchase.update({
      where: {
        id: purchase.id,
      },
      data: {
        paymentStatus: 'completed' as const,
        updatedAt: new Date(),
      },
    });

    console.log(`Pago simulado completado para orden: ${orderId}`);

    return NextResponse.json({
      ok: true,
      message: 'Pago simulado completado',
      purchaseId: purchase.id,
      orderId: orderId
    });

  } catch (error: any) {
    console.error('Error simulando webhook:', error);
    return NextResponse.json(
      { error: 'Error simulando webhook' },
      { status: 500 }
    );
  }
}