import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUserSessionCookie } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET /api/my-tickets - Obtener tickets del usuario actual
export async function GET(request: NextRequest) {
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

    // Obtener todas las compras del usuario con sus tickets
    const purchases = await prisma.ticketPurchase.findMany({
      where: {
        userId: session.userId,
        status: {
          in: ['CONFIRMED', 'PENDING'] // Incluir confirmadas y pendientes
        }
      },
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
        },
        tickets: {
          where: {
            status: 'VALID' // Solo tickets válidos
          }
        }
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
