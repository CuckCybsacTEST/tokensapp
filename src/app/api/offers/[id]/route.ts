import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OfferTimeUtils } from '@/lib/offerTimeUtils';
import { OfferWithPurchases, FormattedOffer } from '@/lib/types/offers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const offerId = params.id;

    // Obtener la oferta con conteo de compras
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
    }) as OfferWithPurchases | null;

    if (!offer) {
      return NextResponse.json(
        { error: 'Oferta no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si está disponible
    const isAvailable = OfferTimeUtils.isOfferAvailable({
      ...offer,
      validFrom: offer.validFrom || undefined,
      validUntil: offer.validUntil || undefined,
      startTime: offer.startTime || undefined,
      endTime: offer.endTime || undefined
    }) &&
    (offer.maxQuantity === null || offer._count.purchases < (offer.maxQuantity || 0));

    // Formatear respuesta
    const formattedOffer: FormattedOffer = {
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

    return NextResponse.json({
      success: true,
      data: {
        ...formattedOffer,
        isAvailable
      }
    });

  } catch (error) {
    console.error('Error fetching offer:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}