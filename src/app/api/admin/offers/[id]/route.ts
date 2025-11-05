import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { OfferTimeUtils } from '@/lib/offerTimeUtils';
import { emitOfferUpdated, emitOfferDeleted } from '@/lib/socket/offers';
import { DateTime } from 'luxon';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const offerId = params.id;

    // Verificar sesión de administrador
    const raw = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN', 'STAFF']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    // Verificar que la oferta existe
    const existingOffer = await prisma.offer.findUnique({
      where: { id: offerId }
    });

    if (!existingOffer) {
      return NextResponse.json(
        { error: 'Oferta no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      price,
      originalPrice,
      imagePath,
      maxQuantity,
      isActive,
      validFrom,
      validUntil,
      availableDays,
      startTime,
      endTime
    } = body;

    // Validaciones básicas
    if (price !== undefined && (price <= 0)) {
      return NextResponse.json(
        { error: 'Precio debe ser mayor a 0' },
        { status: 400 }
      );
    }

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

    // Preparar datos de actualización
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (originalPrice !== undefined) updateData.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
    if (imagePath !== undefined) updateData.imagePath = imagePath;
    if (maxQuantity !== undefined) updateData.maxQuantity = maxQuantity ? parseInt(maxQuantity) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (validFrom !== undefined) updateData.validFrom = validFrom ? DateTime.fromISO(validFrom, { zone: 'America/Lima' }).toJSDate() : null;
    if (validUntil !== undefined) updateData.validUntil = validUntil ? DateTime.fromISO(validUntil, { zone: 'America/Lima' }).toJSDate() : null;
    if (availableDays !== undefined) updateData.availableDays = availableDays ? availableDays.map((d: any) => parseInt(d)) : null;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;

    // Actualizar la oferta
    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: updateData
    });

    // Emitir evento de socket
    emitOfferUpdated(offer);

    return NextResponse.json({
      success: true,
      data: offer
    });

  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const offerId = params.id;

    // Verificar sesión de administrador
    const raw = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN', 'STAFF']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    // Verificar que la oferta existe
    const existingOffer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        _count: {
          select: {
            purchases: true
          }
        }
      }
    });

    if (!existingOffer) {
      return NextResponse.json(
        { error: 'Oferta no encontrada' },
        { status: 404 }
      );
    }

    // No permitir eliminar ofertas con compras completadas
    if (existingOffer._count.purchases > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una oferta que tiene compras realizadas' },
        { status: 400 }
      );
    }

    // Eliminar la oferta
    await prisma.offer.delete({
      where: { id: offerId }
    });

    // Emitir evento de socket
    emitOfferDeleted(offerId);

    return NextResponse.json({
      success: true,
      message: 'Oferta eliminada correctamente'
    });

  } catch (error) {
    console.error('Error deleting offer:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}