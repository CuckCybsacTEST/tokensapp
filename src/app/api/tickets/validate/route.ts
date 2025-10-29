import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionCookie } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const validateTicketSchema = z.object({
  qrCode: z.string().min(1, "Código QR es requerido")
});

// POST /api/tickets/validate - Validar un ticket escaneado
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación de staff/admin
    const cookie = request.headers.get('cookie');
    if (!cookie) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const session = await verifySessionCookie(cookie);
    if (!session) {
      return NextResponse.json(
        { error: "Sesión inválida" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = validateTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { qrCode } = parsed.data;

    // Buscar el ticket por código QR
    const ticket = await prisma.ticket.findFirst({
      where: { qrCode: qrCode },
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
        { error: "Ticket no encontrado" },
        { status: 404 }
      );
    }

    // Verificar estado del ticket
    if (ticket.status === 'USED') {
      return NextResponse.json(
        {
          valid: false,
          error: "Ticket ya utilizado",
          ticket: {
            id: ticket.id,
            status: ticket.status,
            usedAt: ticket.usedAt,
            customerName: ticket.customerName,
            customerDni: ticket.customerDni
          }
        },
        { status: 200 }
      );
    }

    if (ticket.status === 'CANCELLED') {
      return NextResponse.json(
        {
          valid: false,
          error: "Ticket cancelado",
          ticket: {
            id: ticket.id,
            status: ticket.status,
            customerName: ticket.customerName,
            customerDni: ticket.customerDni
          }
        },
        { status: 200 }
      );
    }

    // Ticket válido - marcar como usado
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'USED',
        usedAt: new Date()
      }
    });

    return NextResponse.json({
      valid: true,
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
        usedAt: updatedTicket.usedAt,
        customerName: updatedTicket.customerName,
        customerDni: updatedTicket.customerDni,
        ticketType: ticket.ticketPurchase.ticketType,
        show: ticket.ticketPurchase.ticketType.show
      }
    });
  } catch (error) {
    console.error("Error validating ticket:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
