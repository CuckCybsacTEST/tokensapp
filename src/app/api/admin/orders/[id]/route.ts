import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    // Verificar que el pedido existe
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        servicePoint: {
          include: { location: true }
        },
        location: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar los items del pedido primero (debido a la relación)
    await prisma.orderItem.deleteMany({
      where: { orderId: orderId }
    });

    // Eliminar el pedido
    await prisma.order.delete({
      where: { id: orderId }
    });

    return NextResponse.json({
      message: "Pedido eliminado exitosamente",
      orderId: orderId
    });

  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}