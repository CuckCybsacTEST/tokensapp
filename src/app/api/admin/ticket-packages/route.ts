import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaffAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Verificar que el usuario tenga acceso staff (admin o usuario staff)
    const accessCheck = await verifyStaffAccess(req);
    if (!accessCheck.hasAccess) {
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
    const formattedPackages = ticketPackages.map((pkg) => {
      // Verificaciones de seguridad para evitar errores
      const totalTickets = pkg.totalTickets || 0;
      const usedTickets = pkg.usedTickets || 0;
      const showTitle = pkg.ticketPurchase?.ticketType?.show?.title || 'Sin título';
      const showDate = pkg.ticketPurchase?.ticketType?.show?.startsAt || new Date();
      const ticketTypeName = pkg.ticketPurchase?.ticketType?.name || 'Sin tipo';
      const totalAmount = Number(pkg.ticketPurchase?.totalAmount || 0);

      return {
        id: pkg.id,
        ticketPurchaseId: pkg.ticketPurchaseId,
        ticketTypeId: pkg.ticketTypeId,
        showTitle,
        showDate: showDate.toISOString(),
        ticketTypeName,
        qrCode: pkg.qrCode,
        qrDataUrl: pkg.qrDataUrl,
        totalTickets,
        usedTickets,
        remainingTickets: totalTickets - usedTickets,
        totalAmount,
        status: pkg.status,
        purchasedAt: pkg.createdAt.toISOString(),
        customerName: pkg.customerName || 'Sin nombre',
        customerDni: pkg.customerDni || 'Sin DNI',
        customerPhone: pkg.customerPhone || 'Sin teléfono'
      };
    });

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