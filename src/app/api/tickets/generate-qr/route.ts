import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateQrPngDataUrl } from "@/lib/qr";
import { verifyUserSessionCookie } from "@/lib/auth-user";

export const dynamic = 'force-dynamic';

const generateQrSchema = z.object({
  ticketId: z.string().min(1, "ID del ticket es requerido")
});

// POST /api/tickets/generate-qr - Regenerar QR para un ticket específico
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del usuario
    const cookie = request.headers.get('cookie');
    if (!cookie) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const session = await verifyUserSessionCookie(cookie);
    if (!session) {
      return NextResponse.json(
        { error: "Sesión inválida" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = generateQrSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { ticketId } = parsed.data;

    // Verificar que el ticket pertenece al usuario
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        ticketPurchase: {
          userId: session.userId
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket no encontrado o no autorizado" },
        { status: 404 }
      );
    }

    // Generar nuevo QR
    const qrDataUrl = await generateQrPngDataUrl(ticket.qrCode);

    // Actualizar el ticket con el nuevo QR
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        qrDataUrl: qrDataUrl
      }
    });

    return NextResponse.json({
      ticket: updatedTicket,
      qrDataUrl: qrDataUrl
    });
  } catch (error) {
    console.error("Error generating ticket QR:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
