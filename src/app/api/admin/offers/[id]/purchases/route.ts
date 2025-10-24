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