import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import { OfferTimeUtils } from '@/lib/offerTimeUtils';
import { QRUtils } from '@/lib/qrUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const offerId = params.id;
    let skipQR = false;

    // Variables para datos del cliente
    let customerName = 'Cliente Anónimo';
    let customerWhatsapp = '';

    // Para compras públicas, no requerimos autenticación de usuario
    // Las compras serán anónimas
    let userId = null;

    // Intentar obtener sesión de usuario si existe (opcional)
    const cookie = request.headers.get('cookie');
    if (cookie) {
      try {
        const session = await verifyUserSessionCookie(cookie);
        if (session?.userId) {
          userId = session.userId;
        }
      } catch (e) {
        // Ignorar errores de sesión, continuar como compra anónima
      }
    }

    // Obtener la oferta
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        _count: {
          select: {
            purchases: {
              where: {
                status: 'CONFIRMED'
              }
            }
          }
        }
      }
    });

    if (!offer) {
      return NextResponse.json(
        { error: 'Oferta no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la oferta esté activa
    if (!offer.isActive) {
      return NextResponse.json(
        { error: 'Esta oferta no está disponible' },
        { status: 400 }
      );
    }

    // Verificar disponibilidad temporal
    if (!OfferTimeUtils.isOfferAvailable({
      ...offer,
      validFrom: offer.validFrom || undefined,
      validUntil: offer.validUntil || undefined,
      startTime: offer.startTime || undefined,
      endTime: offer.endTime || undefined
    })) {
      return NextResponse.json(
        { error: 'Esta oferta no está disponible en este momento' },
        { status: 400 }
      );
    }

    // Verificar stock
    if (offer.maxQuantity !== null && offer._count.purchases >= offer.maxQuantity) {
      return NextResponse.json(
        { error: 'Esta oferta está agotada' },
        { status: 400 }
      );
    }

    // Obtener datos del cliente (de la sesión o del body de la request)
    if (userId) {
      // Usuario autenticado - obtener datos de la BD
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          person: {
            select: {
              name: true,
              whatsapp: true
            }
          }
        }
      });

      if (!user?.person) {
        return NextResponse.json(
          { error: 'Datos del usuario incompletos' },
          { status: 400 }
        );
      }

      customerName = user.person.name;
      customerWhatsapp = user.person.whatsapp || '';
    } else {
      // Compra anónima - intentar obtener datos del body
      try {
        const body = await request.json();
        customerName = body.customerName || 'Cliente Anónimo';
        customerWhatsapp = body.customerWhatsapp || '';
        skipQR = body.skipQR || false;
      } catch (e) {
        // No hay body JSON, continuar con datos anónimos
      }
    }

    // Crear la compra de oferta
    const offerPurchase = await prisma.offerPurchase.create({
      data: {
        offerId: offer.id,
        userId: userId, // Puede ser null para compras anónimas
        amount: offer.price,
        currency: 'PEN',
        status: 'PENDING',
        customerName,
        customerWhatsapp,
        customerPhone: customerWhatsapp // Mantener compatibilidad temporal
      }
    });

    // Generar código QR para la compra (solo si no se salta)
    let qrCode: string | undefined;
    let qrDataUrl: string | undefined;

    if (!skipQR) {
      const qrResult = await QRUtils.generatePurchaseQR({
        id: offerPurchase.id,
        offerId: offer.id,
        customerName,
        customerWhatsapp,
        amount: Number(offerPurchase.amount),
        createdAt: offerPurchase.createdAt.toISOString()
      });
      qrCode = qrResult.qrCode;
      qrDataUrl = qrResult.qrDataUrl;

      // Actualizar la compra con el código QR
      await prisma.offerPurchase.update({
        where: { id: offerPurchase.id },
        data: { qrCode }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        purchaseId: offerPurchase.id,
        ...(qrCode && qrDataUrl && { qrCode, qrDataUrl }),
        amount: Number(offerPurchase.amount),
        currency: offerPurchase.currency,
        status: offerPurchase.status
      }
    });

  } catch (error) {
    console.error('Error creating offer purchase:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}