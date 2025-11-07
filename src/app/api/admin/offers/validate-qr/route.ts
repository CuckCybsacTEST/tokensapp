import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { QRUtils } from '@/lib/qrUtils';

export async function POST(request: NextRequest) {
  try {
    // Verificar sesión de staff/admin
    const raw = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN', 'STAFF']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const { qrData } = await request.json();

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

    // Buscar la compra por ID y código QR
    const purchase = await prisma.offerPurchase.findFirst({
      where: {
        id: parsedData.purchaseId,
        qrCode: parsedData.qrCode
      },
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

    if (!purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada o QR inválido' },
        { status: 404 }
      );
    }

    // Verificar que la compra no haya sido ya validada
    if (purchase.status === 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Esta compra ya fue validada anteriormente' },
        { status: 400 }
      );
    }

    // Actualizar estado de la compra a CONFIRMED
    await prisma.offerPurchase.update({
      where: { id: purchase.id },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'completed'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        purchaseId: purchase.id,
        offerTitle: purchase.offer.title,
        customerName: purchase.customerName,
        amount: Number(purchase.amount),
        validatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error validating QR:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
