import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

export async function GET(
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

    // Obtener todas las compras de la oferta
    const purchases = await prisma.offerPurchase.findMany({
      where: { offerId },
      include: {
        offer: true,
        user: {
          select: {
            id: true,
            person: {
              select: {
                name: true,
                whatsapp: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Convertir Decimal a number para los campos de precio
    const purchasesWithNumbers = purchases.map(purchase => ({
      ...purchase,
      amount: Number(purchase.amount),
      offer: {
        ...purchase.offer,
        price: Number(purchase.offer.price),
        originalPrice: purchase.offer.originalPrice ? Number(purchase.offer.originalPrice) : null
      },
      // Para compras anónimas, usar datos del cliente
      user: purchase.user ? {
        id: purchase.user.id,
        name: purchase.user.person?.name || 'Usuario desconocido',
        email: purchase.user.person?.whatsapp || 'Sin email'
      } : {
        id: 'anonymous',
        name: purchase.customerName,
        email: purchase.customerWhatsapp || 'Sin WhatsApp'
      }
    }));

    return NextResponse.json({
      success: true,
      data: purchasesWithNumbers
    });

  } catch (error) {
    console.error('Error fetching offer purchases:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { purchaseId, status } = body;

    if (!purchaseId || !status) {
      return NextResponse.json(
        { error: 'purchaseId y status son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el status sea válido
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'EXPIRED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    // Verificar que la compra pertenece a la oferta especificada
    const purchase = await prisma.offerPurchase.findFirst({
      where: {
        id: purchaseId,
        offerId: offerId
      }
    });

    if (!purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada o no pertenece a esta oferta' },
        { status: 404 }
      );
    }

    // Actualizar el status de la compra
    const updatedPurchase = await prisma.offerPurchase.update({
      where: { id: purchaseId },
      data: { status: status as any },
      include: {
        offer: true,
        user: {
          select: {
            id: true,
            person: {
              select: {
                name: true,
                whatsapp: true
              }
            }
          }
        }
      }
    });

    // Convertir Decimal a number
    const purchaseWithNumbers = {
      ...updatedPurchase,
      amount: Number(updatedPurchase.amount),
      offer: {
        ...updatedPurchase.offer,
        price: Number(updatedPurchase.offer.price),
        originalPrice: updatedPurchase.offer.originalPrice ? Number(updatedPurchase.offer.originalPrice) : null
      },
      user: updatedPurchase.user ? {
        id: updatedPurchase.user.id,
        name: updatedPurchase.user.person?.name || 'Usuario desconocido',
        email: updatedPurchase.user.person?.whatsapp || 'Sin email'
      } : {
        id: 'anonymous',
        name: updatedPurchase.customerName,
        email: updatedPurchase.customerWhatsapp || 'Sin WhatsApp'
      }
    };

    return NextResponse.json({
      success: true,
      data: purchaseWithNumbers
    });

  } catch (error) {
    console.error('Error updating offer purchase status:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}