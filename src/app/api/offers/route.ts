import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OfferTimeUtils } from '@/lib/offerTimeUtils';
import { OfferWithPurchases, FormattedOffer } from '@/lib/types/offers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Obtener todas las ofertas activas
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true
      },
      include: {
        _count: {
          select: {
            purchases: {
              where: {
                status: 'CONFIRMED'
              }
            }
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
          take: 5 // Solo las últimas 5 para mostrar
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }) as unknown as OfferWithPurchases[];

    // Filtrar ofertas disponibles según tiempo y stock
    const availableOffers = offers.filter((offer: OfferWithPurchases) => {
      // Verificar disponibilidad temporal
      if (!OfferTimeUtils.isOfferAvailable({
        ...offer,
        validFrom: offer.validFrom || undefined,
        validUntil: offer.validUntil || undefined,
        startTime: offer.startTime || undefined,
        endTime: offer.endTime || undefined
      })) {
        return false;
      }

      // Verificar stock si está limitado
      if (offer.maxQuantity !== null && offer._count.purchases >= (offer.maxQuantity || 0)) {
        return false;
      }

      return true;
    });

    // Formatear respuesta
    const formattedOffers: FormattedOffer[] = availableOffers.map((offer: OfferWithPurchases) => {
      const isAvailable = OfferTimeUtils.isOfferAvailable({
        ...offer,
        validFrom: offer.validFrom || undefined,
        validUntil: offer.validUntil || undefined,
        startTime: offer.startTime || undefined,
        endTime: offer.endTime || undefined
      }) &&
      (offer.maxQuantity === null || offer._count.purchases < (offer.maxQuantity || 0));

      return {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        price: offer.price,
        originalPrice: offer.originalPrice || undefined,
        imageUrl: offer.imagePath || undefined,
        maxStock: offer.maxQuantity || undefined,
        currentStock: offer.maxQuantity ? offer.maxQuantity - offer._count.purchases : undefined,
        validFrom: offer.validFrom || undefined,
        validUntil: offer.validUntil || undefined,
        availableDays: offer.availableDays || undefined,
        startTime: offer.startTime || undefined,
        endTime: offer.endTime || undefined,
        availabilityText: OfferTimeUtils.formatAvailability({
          ...offer,
          validFrom: offer.validFrom || undefined,
          validUntil: offer.validUntil || undefined,
          startTime: offer.startTime || undefined,
          endTime: offer.endTime || undefined
        }),
        isAvailable,
        createdAt: offer.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedOffers
    });

  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}