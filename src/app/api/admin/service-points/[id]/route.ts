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

// GET /api/admin/service-points/[id] - Obtener punto de servicio específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const servicePoint = await prisma.servicePoint.findUnique({
      where: { id: params.id },
      include: {
        location: true
      }
    });

    if (!servicePoint) {
      return NextResponse.json(
        { error: "Punto de servicio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(servicePoint);
  } catch (error) {
    console.error("Error fetching service point:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/service-points/[id] - Actualizar punto de servicio
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: Partial<ServicePointData> = await request.json();

    // Validaciones
    if (!body.number?.trim()) {
      return NextResponse.json(
        { error: "El número/identificador es obligatorio" },
        { status: 400 }
      );
    }

    if (body.type && !Object.values(ServicePointType).includes(body.type)) {
      return NextResponse.json(
        { error: "Tipo de punto de servicio inválido" },
        { status: 400 }
      );
    }

    if (body.capacity && body.capacity < 1) {
      return NextResponse.json(
        { error: "La capacidad debe ser al menos 1" },
        { status: 400 }
      );
    }

    const updatedServicePoint = await prisma.servicePoint.update({
      where: { id: params.id },
      data: {
        number: body.number,
        name: body.name,
        type: body.type,
        capacity: body.capacity,
        active: body.active,
        positionX: body.positionX,
        positionY: body.positionY
      },
      include: {
        location: true
      }
    });

    return NextResponse.json(updatedServicePoint);
  } catch (error) {
    console.error("Error updating service point:", error);

    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Punto de servicio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/service-points/[id] - Eliminar punto de servicio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar si tiene pedidos asociados
    const servicePointWithOrders = await prisma.servicePoint.findUnique({
      where: { id: params.id },
      include: {
        orders: {
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
            items: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!servicePointWithOrders) {
      return NextResponse.json(
        { error: "Punto de servicio no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si tiene pedidos activos asociados (no cancelados ni entregados)
    const activeOrders = servicePointWithOrders.orders.filter((order: any) =>
      order.status !== 'CANCELLED' && order.status !== 'DELIVERED'
    );

    if (activeOrders.length > 0) {
      // Devolver información detallada de los pedidos activos asociados
      const orderDetails = activeOrders.map((order: any) => ({
        id: order.id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        itemCount: order.items?.length || 0
      }));

      return NextResponse.json(
        {
          error: "No se puede eliminar un punto de servicio que tiene pedidos activos asociados",
          associatedOrders: orderDetails,
          totalOrders: activeOrders.length
        },
        { status: 400 }
      );
    }

    // Si solo tiene pedidos cancelados o entregados, permitir eliminación
    if (servicePointWithOrders.orders.length > 0) {
      console.log(`Eliminando punto de servicio ${servicePointWithOrders.number} con ${servicePointWithOrders.orders.length} pedidos finalizados`);
    }

    await prisma.servicePoint.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: "Punto de servicio eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting service point:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}