import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySessionCookie, getSessionCookieFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado como admin/staff
    const cookie = req.headers.get('cookie');
    if (!cookie) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const session = await verifySessionCookie(cookie);
    if (!session || !session.role || !['ADMIN', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de admin o staff.' },
        { status: 401 }
      );
    }

    // Obtener todos los paquetes de tickets con información relacionada
    const ticketPackages = await prisma.ticketPackage.findMany({
      include: {
        ticketPurchase: {
          include: {
            ticketType: {
              include: {
                show: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transformar los datos para el frontend
    const formattedPackages = ticketPackages.map((pkg) => ({
      id: pkg.id,
      ticketPurchaseId: pkg.ticketPurchaseId,
      ticketTypeId: pkg.ticketTypeId,
      showTitle: pkg.ticketPurchase.ticketType.show.title,
      showDate: pkg.ticketPurchase.ticketType.show.startsAt,
      ticketTypeName: pkg.ticketPurchase.ticketType.name,
      qrCode: pkg.qrCode,
      qrDataUrl: pkg.qrDataUrl,
      totalTickets: pkg.totalTickets,
      usedTickets: pkg.usedTickets,
      remainingTickets: pkg.totalTickets - pkg.usedTickets,
      totalAmount: Number(pkg.ticketPurchase.totalAmount),
      status: pkg.status,
      purchasedAt: pkg.createdAt.toISOString(),
      customerName: pkg.customerName,
      customerDni: pkg.customerDni,
      customerPhone: pkg.customerPhone
    }));

    return NextResponse.json({
      ok: true,
      ticketPackages: formattedPackages
    });

  } catch (error: any) {
    console.error('Error getting ticket packages:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}