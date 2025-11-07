import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUserSessionCookie, getUserSessionCookieFromRequest } from '@/lib/auth';

interface ValidatePackageRequest {
  qrCode: string;
  entriesToUse?: number; // Número de entradas a usar (default: 1)
}

export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado como admin/staff
    const cookie = req.headers.get('cookie');
    if (!cookie) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const session = await verifyUserSessionCookie(cookie);
    if (!session || !['ADMIN', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de admin o staff.' },
        { status: 401 }
      );
    }

    const body: ValidatePackageRequest = await req.json();
    const { qrCode, entriesToUse = 1 } = body;

    if (!qrCode?.trim()) {
      return NextResponse.json(
        { error: 'Código QR requerido' },
        { status: 400 }
      );
    }

    if (entriesToUse < 1) {
      return NextResponse.json(
        { error: 'El número de entradas a usar debe ser al menos 1' },
        { status: 400 }
      );
    }

    // Buscar el paquete por código QR
    const ticketPackage = await prisma.ticketPackage.findUnique({
      where: { qrCode: qrCode.trim() },
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
      }
    });

    if (!ticketPackage) {
      return NextResponse.json(
        { error: 'Código QR no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el paquete esté activo
    if (ticketPackage.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Este paquete de tickets no está activo' },
        { status: 400 }
      );
    }

    // Verificar que el show no haya pasado
    const show = ticketPackage.ticketPurchase.ticketType.show;
    if (show.startsAt < new Date()) {
      return NextResponse.json(
        { error: 'El show ya ha comenzado o terminado' },
        { status: 400 }
      );
    }

    // Calcular entradas disponibles
    const availableEntries = ticketPackage.totalTickets - ticketPackage.usedTickets;

    if (availableEntries <= 0) {
      return NextResponse.json(
        { error: 'Todas las entradas de este paquete ya han sido utilizadas' },
        { status: 400 }
      );
    }

    if (entriesToUse > availableEntries) {
      return NextResponse.json(
        {
          error: `Solo quedan ${availableEntries} entradas disponibles en este paquete`,
          availableEntries
        },
        { status: 400 }
      );
    }

    // Actualizar el contador de entradas utilizadas
    const updatedPackage = await prisma.ticketPackage.update({
      where: { id: ticketPackage.id },
      data: {
        usedTickets: {
          increment: entriesToUse
        }
      },
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
      }
    });

    // Obtener información del usuario validador
    const validatorUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        username: true,
        person: {
          select: {
            name: true
          }
        }
      }
    });

    // Emitir evento de socket para actualizar la UI en tiempo real
    const io = (global as any).io;
    if (io) {
      io.to("staff-general").emit("ticket-validated", {
        packageId: updatedPackage.id,
        qrCode: updatedPackage.qrCode,
        entriesUsed: entriesToUse,
        totalUsed: updatedPackage.usedTickets,
        totalTickets: updatedPackage.totalTickets,
        remainingEntries: updatedPackage.totalTickets - updatedPackage.usedTickets,
        customerName: updatedPackage.customerName,
        ticketTypeName: updatedPackage.ticketPurchase.ticketType.name,
        showTitle: show.title,
        validatedBy: validatorUser?.person?.name || validatorUser?.username || 'Usuario desconocido'
      });
    }

    return NextResponse.json({
      ok: true,
      package: {
        id: updatedPackage.id,
        qrCode: updatedPackage.qrCode,
        totalTickets: updatedPackage.totalTickets,
        usedTickets: updatedPackage.usedTickets,
        remainingEntries: updatedPackage.totalTickets - updatedPackage.usedTickets,
        customerName: updatedPackage.customerName,
        customerDni: updatedPackage.customerDni,
        ticketTypeName: updatedPackage.ticketPurchase.ticketType.name,
        showTitle: show.title,
        showStartsAt: show.startsAt
      },
      entriesValidated: entriesToUse,
      message: `${entriesToUse} entrada(s) validada(s) exitosamente`
    });

  } catch (error: any) {
    console.error('Error validating ticket package:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint GET para obtener información de un paquete sin validarlo
export async function GET(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie');
    if (!cookie) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const session = await verifyUserSessionCookie(cookie);
    if (!session || !['ADMIN', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const qrCode = searchParams.get('qrCode');

    if (!qrCode?.trim()) {
      return NextResponse.json(
        { error: 'Código QR requerido' },
        { status: 400 }
      );
    }

    const ticketPackage = await prisma.ticketPackage.findUnique({
      where: { qrCode: qrCode.trim() },
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
      }
    });

    if (!ticketPackage) {
      return NextResponse.json(
        { error: 'Paquete no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      package: {
        id: ticketPackage.id,
        qrCode: ticketPackage.qrCode,
        totalTickets: ticketPackage.totalTickets,
        usedTickets: ticketPackage.usedTickets,
        remainingEntries: ticketPackage.totalTickets - ticketPackage.usedTickets,
        customerName: ticketPackage.customerName,
        customerDni: ticketPackage.customerDni,
        ticketTypeName: ticketPackage.ticketPurchase.ticketType.name,
        showTitle: ticketPackage.ticketPurchase.ticketType.show.title,
        showStartsAt: ticketPackage.ticketPurchase.ticketType.show.startsAt,
        status: ticketPackage.status
      }
    });

  } catch (error: any) {
    console.error('Error getting ticket package info:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
