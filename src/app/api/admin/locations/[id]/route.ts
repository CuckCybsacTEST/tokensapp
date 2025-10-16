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

// GET /api/admin/locations/[id] - Obtener ubicación específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const location = await prisma.location.findUnique({
      where: { id: params.id },
      include: {
        servicePoints: {
          orderBy: { name: "asc" }
        }
      }
    });

    if (!location) {
      return NextResponse.json(
        { error: "Ubicación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/locations/[id] - Actualizar ubicación
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: Partial<LocationData> = await request.json();

    // Validaciones
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (body.type && !Object.values(LocationType).includes(body.type)) {
      return NextResponse.json(
        { error: "Tipo de ubicación inválido" },
        { status: 400 }
      );
    }

    const updatedLocation = await prisma.location.update({
      where: { id: params.id },
      data: {
        name: body.name,
        type: body.type,
        active: body.active,
        order: body.order
      },
      include: {
        servicePoints: {
          orderBy: { name: "asc" }
        }
      }
    });

    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error("Error updating location:", error);

    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Ubicación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/locations/[id] - Eliminar ubicación
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar si tiene puntos de servicio asociados
    const locationWithServicePoints = await prisma.location.findUnique({
      where: { id: params.id },
      include: {
        servicePoints: true,
        orders: true
      }
    });

    if (!locationWithServicePoints) {
      return NextResponse.json(
        { error: "Ubicación no encontrada" },
        { status: 404 }
      );
    }

    if (locationWithServicePoints.servicePoints.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una ubicación que tiene puntos de servicio asociados" },
        { status: 400 }
      );
    }

    if (locationWithServicePoints.orders.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una ubicación que tiene pedidos asociados" },
        { status: 400 }
      );
    }

    await prisma.location.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: "Ubicación eliminada exitosamente" });
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}