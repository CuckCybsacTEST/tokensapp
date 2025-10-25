import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { QRUtils } from '@/lib/qrUtils';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import { DateTime } from 'luxon';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrData } = body;

    if (!qrData) {
      return NextResponse.json(
        { error: 'Datos del QR requeridos' },
        { status: 400 }
      );
    }

    // Parsear datos del QR
    const parsedData = QRUtils.parseQRData(qrData);
    if (!parsedData) {
      return NextResponse.json(
        { error: 'Código QR inválido' },
        { status: 400 }
      );
    }

    // Verificar que sea un QR de oferta
    if (parsedData.type !== 'offer_purchase') {
      return NextResponse.json(
        { error: 'Este QR no corresponde a una compra de oferta' },
        { status: 400 }
      );
    }

    // Buscar la compra en la base de datos
    const purchase = await prisma.offerPurchase.findUnique({
      where: { id: parsedData.purchaseId },
      include: {
        offer: true,
        user: {
          include: {
            person: true
          }
        }
      }
    });

    if (!purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el QR coincida
    if (purchase.qrCode !== parsedData.qrCode) {
      return NextResponse.json(
        { error: 'Código QR no válido para esta compra' },
        { status: 400 }
      );
    }

    // Determinar el estado del QR
    let qrStatus: 'active' | 'expired' | 'used' | 'cancelled' | 'refunded' = 'active';
    let statusMessage = 'Código QR válido - Pendiente de entrega';

    // Verificar restricciones temporales de la oferta desde el QR
    const offerData = parsedData.offer;
    if (offerData) {
      const timezone = offerData.timezone || 'America/Lima';

      // Crear fecha actual en la zona horaria de la oferta usando Luxon
      const nowInTimezone: DateTime = DateTime.now().setZone(timezone);

      // Verificar validFrom
      if (offerData.validFrom) {
        const validFromStr = offerData.validFrom.replace('Z', '').replace(/\+.*$/, '');
        const validFrom = DateTime.fromISO(validFromStr, { zone: timezone });
        if (nowInTimezone < validFrom) {
          qrStatus = 'expired';
        // @ts-ignore - toFormat method exists in Luxon DateTime
        statusMessage = `Código QR no válido aún. Válido desde ${validFrom.toFormat('dd/MM/yyyy HH:mm')}`;
        }
      }

      // Verificar validUntil
      if (offerData.validUntil && qrStatus === 'active') {
        const validUntilStr = offerData.validUntil.replace('Z', '').replace(/\+.*$/, '');
        const validUntil = DateTime.fromISO(validUntilStr, { zone: timezone });
        if (nowInTimezone > validUntil) {
          qrStatus = 'expired';
        // @ts-ignore - toFormat method exists in Luxon DateTime
        statusMessage = `Código QR expirado. Venció el ${validUntil.toFormat('dd/MM/yyyy HH:mm')}`;
        }
      }

      // Verificar días disponibles
      if (offerData.availableDays && offerData.availableDays.length > 0 && qrStatus === 'active') {
        const currentDay = (nowInTimezone as any).weekday; // 1 = Lunes, 7 = Domingo (Luxon)
        // Convertir de formato JS (0=domingo) a Luxon (1=lunes)
        const jsDayToLuxon = [7, 1, 2, 3, 4, 5, 6]; // 0->7, 1->1, etc.
        const currentDayJS = jsDayToLuxon[currentDay];
        if (!offerData.availableDays.includes(currentDayJS)) {
          const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          qrStatus = 'expired';
          statusMessage = `Código QR no válido hoy (${dayNames[currentDayJS]}). Días válidos: ${offerData.availableDays.map(d => dayNames[d]).join(', ')}`;
        }
      }

      // Verificar horario (startTime y endTime)
      if (offerData.startTime && offerData.endTime && qrStatus === 'active') {
        const currentTime = (nowInTimezone as any).hour * 100 + (nowInTimezone as any).minute; // HHMM format
        const startTime = parseInt(offerData.startTime.replace(':', ''));
        const endTime = parseInt(offerData.endTime.replace(':', ''));

        if (currentTime < startTime || currentTime > endTime) {
          qrStatus = 'expired';
          statusMessage = `Código QR fuera de horario. Horario válido: ${offerData.startTime} - ${offerData.endTime}`;
        }
      }
    }

    // Verificar si está expirado por tiempo (24 horas desde compra) - solo si aún está activo
    if (qrStatus === 'active') {
      const now = new Date();
      const purchaseDate = new Date(purchase.createdAt);
      const hoursSincePurchase = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60);

      // QR válido por 24 horas desde la compra
      if (hoursSincePurchase > 24) {
        qrStatus = 'expired';
        statusMessage = 'Código QR expirado (más de 24 horas desde la compra)';
      }
    }

    // Verificar estado de la compra
    if (qrStatus === 'active') {
      if (purchase.status === 'CANCELLED') {
        qrStatus = 'cancelled';
        statusMessage = 'Compra cancelada';
      }
      else if (purchase.status === 'REFUNDED') {
        qrStatus = 'refunded';
        statusMessage = 'Compra reembolsada';
      }
      else if (purchase.status === 'EXPIRED') {
        qrStatus = 'expired';
        statusMessage = 'Compra expirada';
      }
      else if (purchase.status === 'CONFIRMED') {
        qrStatus = 'used';
        statusMessage = 'Entrega ya completada';
      }
      // PENDING es válido para completar entrega
    }

    // Verificar si el usuario está autenticado (para mostrar info adicional en admin)
    let isAdmin = false;
    try {
      const cookie = request.headers.get('cookie');
      if (cookie) {
        const session = await verifyUserSessionCookie(cookie);
        if (session?.role === 'STAFF') {
          isAdmin = true;
        }
      }
    } catch (e) {
      // No está autenticado como admin
    }

    // Preparar respuesta base
    const basePurchase = {
      id: purchase.id,
      purchaseId: parsedData.purchaseId,
      amount: Number(purchase.amount),
      currency: purchase.currency,
      createdAt: purchase.createdAt.toISOString(),
      customerName: purchase.customerName,
      customerWhatsapp: (purchase as any).customerWhatsapp,
      qrCode: purchase.qrCode
    };

    const response: any = {
      valid: qrStatus === 'active',
      status: qrStatus,
      message: statusMessage,
      purchase: basePurchase,
      offer: {
        id: purchase.offer.id,
        title: purchase.offer.title,
        description: purchase.offer.description,
        price: Number(purchase.offer.price),
        isActive: purchase.offer.isActive,
        validFrom: purchase.offer.validFrom,
        validUntil: purchase.offer.validUntil,
        timezone: purchase.offer.timezone,
        availableDays: purchase.offer.availableDays,
        startTime: purchase.offer.startTime,
        endTime: purchase.offer.endTime,
        maxQuantity: purchase.offer.maxQuantity
      }
    };

    // Agregar información adicional para admin/staff
    if (isAdmin) {
      response.purchase = {
        ...response.purchase,
        customerPhone: purchase.customerPhone,
        customerDni: purchase.customerDni,
        status: purchase.status,
        culqiChargeId: purchase.culqiChargeId,
        culqiPaymentId: purchase.culqiPaymentId,
        paymentStatus: purchase.paymentStatus,
        userId: purchase.userId,
        user: purchase.user ? {
          username: purchase.user.username,
          person: purchase.user.person ? {
            name: purchase.user.person.name,
            whatsapp: purchase.user.person.whatsapp
          } : null
        } : null
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error validating offer QR:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}