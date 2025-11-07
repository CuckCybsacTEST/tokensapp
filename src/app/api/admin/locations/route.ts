import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

enum LocationType {
  DINING = "DINING",
  VIP = "VIP",
  BAR = "BAR"
}

interface LocationData {
  name: string;
  type: LocationType;
  active: boolean;
  order: number;
}

// GET /api/admin/locations - Obtener todas las ubicaciones
export async function GET(request: NextRequest) {
  try {
    const locations = await prisma.location.findMany({
      include: {
        servicePoints: {
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
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST /api/admin/locations - Crear nueva ubicación
export async function POST(request: NextRequest) {
  try {
    const body: LocationData = await request.json();

    // Validaciones
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (!Object.values(LocationType).includes(body.type)) {
      return NextResponse.json(
        { error: "Tipo de ubicación inválido" },
        { status: 400 }
      );
    }

    const newLocation = await prisma.location.create({
      data: {
        name: body.name,
        type: body.type,
        active: body.active ?? true,
        order: body.order ?? 0
      },
      include: {
        servicePoints: {
          orderBy: { name: "asc" }
        }
      }
    });

    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
