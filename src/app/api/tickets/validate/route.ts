import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { QRUtils } from '@/lib/qrUtils';
import { verifyUserSessionCookie } from '@/lib/auth-user';

interface ValidateTicketRequest {
  qrData: string; // El string JSON del QR escaneado
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación (solo staff/admin pueden validar tickets)
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

    const body: ValidateTicketRequest = await req.json();
    const { qrData } = body;

    if (!qrData) {
      return NextResponse.json(
        { error: 'qrData es requerido' },
        { status: 400 }
      );
    }

    // Parsear datos del QR
    const parsedData = QRUtils.parseTicketQRData(qrData);
    if (!parsedData) {
      return NextResponse.json(
        { error: 'Código QR inválido o corrupto' },
        { status: 400 }
      );
    }

    // Buscar el ticket en la base de datos
    const ticket = await prisma.ticket.findUnique({
      where: { id: parsedData.ticketId },
      include: {
        ticketType: {
          include: {
            show: true
          }
        },
        ticketPurchase: true
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado en el sistema' },
        { status: 404 }
      );
    }

    // Verificar que el QR code coincida
    if (ticket.qrCode !== parsedData.qrCode) {
      return NextResponse.json(
        { error: 'Código QR no coincide con el ticket' },
        { status: 400 }
      );
    }

    // Verificar estado del ticket
    if (ticket.status === 'USED') {
      return NextResponse.json({
        valid: false,
        reason: 'TICKET_ALREADY_USED',
        message: 'Este ticket ya fue utilizado',
        ticket: {
          id: ticket.id,
          customerName: ticket.customerName,
          customerDni: ticket.customerDni,
          usedAt: ticket.usedAt,
          ticketType: ticket.ticketType.name,
          show: ticket.ticketType.show.title
        }
      });
    }

    if (ticket.status === 'CANCELLED') {
      return NextResponse.json({
        valid: false,
        reason: 'TICKET_CANCELLED',
        message: 'Este ticket fue cancelado',
        ticket: {
          id: ticket.id,
          customerName: ticket.customerName,
          customerDni: ticket.customerDni,
          ticketType: ticket.ticketType.name,
          show: ticket.ticketType.show.title
        }
      });
    }

    // Verificar que el show no haya pasado
    const now = new Date();
    const showStart = new Date(ticket.ticketType.show.startsAt);
    if (showStart < now) {
      return NextResponse.json({
        valid: false,
        reason: 'SHOW_ALREADY_STARTED',
        message: 'El show ya comenzó o terminó',
        ticket: {
          id: ticket.id,
          customerName: ticket.customerName,
          customerDni: ticket.customerDni,
          ticketType: ticket.ticketType.name,
          show: ticket.ticketType.show.title,
          showStartsAt: ticket.ticketType.show.startsAt
        }
      });
    }

    // Ticket válido - marcar como usado
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'USED',
        usedAt: new Date()
      }
    });

    // Emitir evento de ticket validado
    const io = (global as any).io;
    if (io) {
      io.to("staff-general").emit("ticket-validated", {
        ticketId: ticket.id,
        customerName: ticket.customerName,
        customerDni: ticket.customerDni,
        ticketType: ticket.ticketType.name,
        showTitle: ticket.ticketType.show.title,
        validatedBy: session.userId,
        validatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      valid: true,
      message: 'Ticket válido - Ingreso autorizado',
      ticket: {
        id: updatedTicket.id,
        customerName: updatedTicket.customerName,
        customerDni: updatedTicket.customerDni,
        ticketType: ticket.ticketType.name,
        show: ticket.ticketType.show.title,
        usedAt: updatedTicket.usedAt
      }
    });

  } catch (error: any) {
    console.error('Error validating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}