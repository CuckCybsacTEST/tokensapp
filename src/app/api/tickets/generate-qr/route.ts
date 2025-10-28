import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { QRUtils } from '@/lib/qrUtils';
import { verifyUserSessionCookie } from '@/lib/auth-user';

interface GenerateQRRequest {
  ticketId: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación (solo staff/admin pueden regenerar QR)
    const cookie = req.headers.get('cookie');
    if (!cookie) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const session = await verifyUserSessionCookie(cookie);
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión inválida' },
        { status: 401 }
      );
    }

    // Verificar que sea staff o admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const body: GenerateQRRequest = await req.json();
    const { ticketId } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'ticketId es requerido' },
        { status: 400 }
      );
    }

    // Buscar el ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
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

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Generar nuevo QR
    const qrResult = await QRUtils.generateTicketQR({
      id: ticket.id,
      ticketPurchaseId: ticket.ticketPurchaseId,
      ticketTypeId: ticket.ticketTypeId,
      showId: ticket.ticketPurchase.ticketType.show.id,
      customerDni: ticket.customerDni,
      customerName: ticket.customerName,
      customerPhone: ticket.customerPhone,
      ticketType: {
        id: ticket.ticketPurchase.ticketType.id,
        name: ticket.ticketPurchase.ticketType.name,
        price: Number(ticket.ticketPurchase.ticketType.price),
        show: {
          id: ticket.ticketPurchase.ticketType.show.id,
          title: ticket.ticketPurchase.ticketType.show.title,
          startsAt: ticket.ticketPurchase.ticketType.show.startsAt.toISOString(),
          endsAt: ticket.ticketPurchase.ticketType.show.endsAt?.toISOString() || null
        }
      }
    });

    // Actualizar el ticket con el nuevo QR
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        qrCode: qrResult.qrCode,
        qrDataUrl: qrResult.qrDataUrl
      }
    });

    return NextResponse.json({
      ok: true,
      ticket: {
        id: updatedTicket.id,
        qrCode: updatedTicket.qrCode,
        qrDataUrl: updatedTicket.qrDataUrl,
        status: updatedTicket.status
      },
      message: 'QR code regenerado exitosamente'
    });

  } catch (error: any) {
    console.error('Error generating QR:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}