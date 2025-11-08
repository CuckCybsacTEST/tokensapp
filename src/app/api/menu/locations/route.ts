import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/menu/locations - Obtener ubicaciones activas para el menú (acceso público para usuarios autenticados)
export async function GET(request: NextRequest) {
  try {
    const locations = await prisma.location.findMany({
      where: {
        active: true
      },
      include: {
        servicePoints: {
          where: {
            active: true
          },
          include: {
            location: true
          },
          orderBy: {
            name: "asc"
          }
        }
      },
      orderBy: {
        type: "asc"
      }
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching menu locations:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}