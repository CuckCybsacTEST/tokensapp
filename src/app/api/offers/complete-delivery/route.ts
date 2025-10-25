import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado como admin/staff
    const cookie = request.headers.get('cookie');
    if (!cookie) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const session = await verifyUserSessionCookie(cookie);
    if (!session || session.role !== 'STAFF') {
      return NextResponse.json(
        { error: 'No autorizado - se requiere rol de staff' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { purchaseId } = body;

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'ID de compra requerido' },
        { status: 400 }
      );
    }

    // Buscar la compra
    const purchase = await prisma.offerPurchase.findUnique({
      where: { id: purchaseId },
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

    // Verificar que esté en estado PENDING
    if (purchase.status !== 'PENDING') {
      return NextResponse.json(
        { error: `No se puede completar la entrega. Estado actual: ${purchase.status}` },
        { status: 400 }
      );
    }

    // Actualizar el estado a CONFIRMED
    const updatedPurchase = await prisma.offerPurchase.update({
      where: { id: purchaseId },
      data: {
        status: 'CONFIRMED',
        updatedAt: new Date()
      },
      include: {
        offer: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Entrega completada exitosamente',
      purchase: {
        id: updatedPurchase.id,
        status: updatedPurchase.status,
        customerName: updatedPurchase.customerName,
        offerTitle: updatedPurchase.offer.title,
        amount: Number(updatedPurchase.amount),
        completedAt: updatedPurchase.updatedAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error completing offer delivery:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}