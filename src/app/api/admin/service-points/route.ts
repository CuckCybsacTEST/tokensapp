import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

enum ServicePointType {
  TABLE = "TABLE",
  BOX = "BOX",
  ZONE = "ZONE"
}

interface ServicePointData {
  locationId: string;
  number: string;
  name?: string;
  type: ServicePointType;
  capacity: number;
  active: boolean;
  positionX?: number;
  positionY?: number;
}

// POST /api/admin/service-points - Crear nuevo punto de servicio
export async function POST(request: NextRequest) {
  try {
    const body: ServicePointData = await request.json();

    // Validaciones
    if (!body.locationId) {
      return NextResponse.json(
        { error: "El ID de ubicación es obligatorio" },
        { status: 400 }
      );
    }

    if (!body.number?.trim()) {
      return NextResponse.json(
        { error: "El número/identificador es obligatorio" },
        { status: 400 }
      );
    }

    if (!Object.values(ServicePointType).includes(body.type)) {
      return NextResponse.json(
        { error: "Tipo de punto de servicio inválido" },
        { status: 400 }
      );
    }

    if (body.capacity < 1) {
      return NextResponse.json(
        { error: "La capacidad debe ser al menos 1" },
        { status: 400 }
      );
    }

    // Verificar que la ubicación existe
    const location = await prisma.location.findUnique({
      where: { id: body.locationId }
    });

    if (!location) {
      return NextResponse.json(
        { error: "Ubicación no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que no exista otro punto de servicio con el mismo número en la misma ubicación
    const existingServicePoint = await prisma.servicePoint.findFirst({
      where: {
        locationId: body.locationId,
        number: body.number
      }
    });

    if (existingServicePoint) {
      return NextResponse.json(
        { error: "Ya existe un punto de servicio con este número en la ubicación" },
        { status: 400 }
      );
    }

    const newServicePoint = await prisma.servicePoint.create({
      data: {
        locationId: body.locationId,
        number: body.number,
        name: body.name,
        type: body.type,
        capacity: body.capacity,
        active: body.active ?? true,
        positionX: body.positionX,
        positionY: body.positionY
      },
      include: {
        location: true
      }
    });

    return NextResponse.json(newServicePoint, { status: 201 });
  } catch (error) {
    console.error("Error creating service point:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}