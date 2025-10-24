import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { OfferTimeUtils } from '@/lib/offerTimeUtils';
import { emitOfferCreated } from '@/lib/socket/offers';

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión de administrador
    const raw = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN', 'STAFF']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    // Obtener todas las ofertas con estadísticas
    const offers = await prisma.offer.findMany({
      include: {
        _count: {
          select: {
            purchases: true
          }
        },
        purchases: {
          where: {
            status: 'CONFIRMED'
          },
          select: {
            amount: true,
            currency: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5 // Últimas 5 compras
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular estadísticas
    const offersWithStats = offers.map(offer => {
      const completedPurchases = offer.purchases;
      const totalRevenue = completedPurchases.reduce((sum, purchase) => sum + Number(purchase.amount), 0);
      const isAvailable = OfferTimeUtils.isOfferAvailable({
        ...offer,
        validFrom: offer.validFrom || undefined,
        validUntil: offer.validUntil || undefined,
        startTime: offer.startTime || undefined,
        endTime: offer.endTime || undefined
      }) &&
      (offer.maxQuantity === null || offer._count.purchases < offer.maxQuantity);

      return {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        price: Number(offer.price),
        originalPrice: offer.originalPrice ? Number(offer.originalPrice) : null,
        imageUrl: offer.imagePath,
        maxStock: offer.maxQuantity,
        currentStock: offer.maxQuantity ? offer.maxQuantity - offer._count.purchases : null,
        isActive: offer.isActive,
        validFrom: offer.validFrom,
        validUntil: offer.validUntil,
        availableDays: offer.availableDays,
        startTime: offer.startTime,
        endTime: offer.endTime,
        availabilityText: OfferTimeUtils.formatAvailability({
          ...offer,
          validFrom: offer.validFrom || undefined,
          validUntil: offer.validUntil || undefined,
          startTime: offer.startTime || undefined,
          endTime: offer.endTime || undefined
        }),
        isAvailable,
        totalPurchases: offer._count.purchases,
        totalRevenue,
        recentPurchases: completedPurchases.slice(0, 5),
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt
      };
    });

    return NextResponse.json({
      success: true,
      data: offersWithStats
    });

  } catch (error) {
    console.error('Error fetching admin offers:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar sesión de administrador
    const raw = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN', 'STAFF']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const body = await request.json();
    const {
      title,
      description,
      price,
      originalPrice,
      imagePath,
      maxQuantity,
      isActive = true,
      validFrom,
      validUntil,
      availableDays,
      startTime,
      endTime
    } = body;

    // Validaciones básicas
    if (!title || !description || !price || price <= 0) {
      return NextResponse.json(
        { error: 'Título, descripción y precio válido son requeridos' },
        { status: 400 }
      );
    }

    // imagePath puede estar vacío inicialmente, se actualizará cuando se suba la imagen
    // if (!imagePath || imagePath.trim() === '') {
    //   return NextResponse.json(
    //     { error: 'La ruta de la imagen es requerida' },
    //     { status: 400 }
    //   );
    // }

    // Validar tiempos
    const timeErrors = OfferTimeUtils.validateOfferTimes({
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      startTime,
      endTime
    });

    if (timeErrors.length > 0) {
      return NextResponse.json(
        { error: timeErrors.join(', ') },
        { status: 400 }
      );
    }

    // Crear la oferta
    const offer = await prisma.offer.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        imagePath: imagePath || '/offers/placeholder.jpg', // Valor por defecto si no se proporciona
        imageWebpPath: '', // TODO: Generar WebP cuando se suba imagen
        imageBlurData: '', // TODO: Generar blur data cuando se suba imagen
        width: 0, // TODO: Obtener dimensiones cuando se suba imagen
        height: 0, // TODO: Obtener dimensiones cuando se suba imagen
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : null,
        isActive,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        availableDays: availableDays ? availableDays.map((d: any) => parseInt(d)) : null,
        startTime,
        endTime
      }
    });

    // Emitir evento de socket
    emitOfferCreated(offer);

    return NextResponse.json({
      success: true,
      data: offer
    });

  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}