import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUserSessionCookie } from "@/lib/auth-user";

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

    // Obtener el ticket con verificación de propiedad
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: params.id,
        ticketPurchase: {
          userId: session.userId
        }
      },
      include: {
        ticketPurchase: {
          include: {
            ticketType: {
              include: {
                show: {
                  select: {
                    id: true,
                    title: true,
                    startsAt: true,
                    imageWebpPath: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      }
    });

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
