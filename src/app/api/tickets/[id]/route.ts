import { NextRequest, NextResponse } from "next/server";
import { getTicketByIdForUser } from "@/lib/tickets/service";
import { verifyUserSessionCookie } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET /api/tickets/[id] - Obtener detalles de un ticket específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Obtener el ticket con verificación de propiedad usando Supabase
    const ticket = await getTicketByIdForUser(params.id, session.userId);

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket no encontrado o no autorizado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
