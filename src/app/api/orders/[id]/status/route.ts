import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    console.log("🔄 Recibido status:", status, "para order:", params.id);

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED", "pendiente", "confirmado", "preparando", "listo", "entregado", "cancelado"];
    console.log("📋 Status válidos:", validStatuses);
    console.log("❓ Status incluido:", validStatuses.includes(status));
    
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    // Mapear status a formato de base de datos
    const statusMapping: { [key: string]: string } = {
      "PENDING": "pendiente",
      "CONFIRMED": "confirmado", 
      "PREPARING": "preparando",
      "READY": "listo",
      "DELIVERED": "entregado",
      "CANCELLED": "cancelado",
      "pendiente": "pendiente",
      "confirmado": "confirmado",
      "preparando": "preparando",
      "listo": "listo",
      "entregado": "entregado",
      "cancelado": "cancelado"
    };

    const dbStatus = statusMapping[status] || status;

    // Actualizar el estado del pedido
    const updatedOrder = await prisma.order.update({
      where: {
  id: params.id,
      },
      data: {
        status: status,
        updatedAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        table: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}