import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateQrPngDataUrl } from "@/lib/qr";
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const generateQrSchema = z.object({
  ticketId: z.string().min(1, "ID del ticket es requerido")
});

// POST /api/tickets/generate-qr - Regenerar QR para un ticket específico
export async function POST(request: NextRequest) {
  try {
    // Verificar sesión de administrador
    const raw = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN', 'STAFF']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const body = await request.json();
    const parsed = generateQrSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { ticketId } = parsed.data;

    // Verificar que el ticket existe (admin puede acceder a cualquier ticket)
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket no encontrado" },
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
      success: true,
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
