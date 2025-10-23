import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import culqi from '../../../../../../lib/culqi';
import { isCulqiRealMode } from '@/lib/featureFlags';
import { emitOfferPurchased } from '@/lib/socket/offers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let purchaseId: string | undefined;

  try {
    const offerId = params.id;
    const { token, purchaseId: pid } = await request.json();
    purchaseId = pid;

    // Verificar sesión del usuario
    const cookie = request.headers.get('cookie');
    if (!cookie) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    const session = await verifyUserSessionCookie(cookie);
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Sesión inválida' },
        { status: 401 }
      );
    }

    const userId = session.userId;

    // Verificar que la compra existe y pertenece al usuario
    const offerPurchase = await prisma.offerPurchase.findUnique({
      where: { id: purchaseId },
      include: { offer: true }
    });

    if (!offerPurchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      );
    }

    if (offerPurchase.userId !== userId) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    if (offerPurchase.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Esta compra ya ha sido procesada' },
        { status: 400 }
      );
    }

    if (offerPurchase.offerId !== offerId) {
      return NextResponse.json(
        { error: 'La compra no corresponde a esta oferta' },
        { status: 400 }
      );
    }

    let charge;

    if (isCulqiRealMode()) {
      // Modo real: procesar cargo con Culqi
      charge = await culqi().charges.createCharge({
        amount: Math.round(Number(offerPurchase.amount) * 100).toString(), // en centavos como string
        currency_code: offerPurchase.currency,
        email: 'cliente@offers.com', // TODO: Usar email del usuario cuando esté disponible
        source_id: token,
      });
    } else {
      // Modo demo: simular cargo exitoso
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay de procesamiento

      charge = {
        id: `demo_charge_${Date.now()}`,
        amount: Math.round(Number(offerPurchase.amount) * 100),
        currency_code: offerPurchase.currency,
        email: 'cliente@offers.com',
        source_id: token,
        outcome: { type: 'venta_exitosa', code: '000' },
        creation_date: Math.floor(Date.now() / 1000),
        state: 'paid'
      };
    }

    // Actualizar el estado de la compra
    const updatedPurchase = await prisma.offerPurchase.update({
      where: { id: purchaseId },
      data: {
        status: 'CONFIRMED',
        culqiChargeId: charge.id,
        culqiPaymentId: charge.id, // Usar el mismo ID por simplicidad
        updatedAt: new Date(),
      },
      include: {
        offer: true,
        user: {
          select: {
            id: true,
            person: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Emitir evento de socket
    emitOfferPurchased(updatedPurchase);

    return NextResponse.json({
      success: true,
      data: {
        chargeId: charge.id,
        status: 'CONFIRMED',
        amount: offerPurchase.amount,
        currency: offerPurchase.currency
      }
    });

  } catch (error: any) {
    console.error('Error processing offer payment:', error);

    // Si hay un error y tenemos un purchaseId, marcar como fallido
    if (purchaseId) {
      try {
        await prisma.offerPurchase.update({
          where: { id: purchaseId },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date(),
          }
        });
      } catch (updateError) {
        console.error('Error updating failed purchase:', updateError);
      }
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}