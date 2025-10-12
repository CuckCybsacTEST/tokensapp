import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth-user";
import { mapAreaToStaffRole, getStaffPermissions } from "@/lib/staff-roles";
import { isValidArea } from "@/lib/areas";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const cookie = getUserSessionCookieFromRequest(request);
    const session = await verifyUserSessionCookie(cookie);

    if (!session) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Obtener perfil del usuario
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { person: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Validar que tenga acceso al restaurante
    const userArea = user.person?.area;
    const validArea = userArea && isValidArea(userArea) ? userArea : null;
    const restaurantRole = mapAreaToStaffRole(validArea);

    if (!restaurantRole) {
      return NextResponse.json(
        { error: "No tienes acceso al sistema de restaurante" },
        { status: 403 }
      );
    }

    const permissions = getStaffPermissions(restaurantRole);

    if (!permissions.canUpdateOrderStatus) {
      return NextResponse.json(
        { error: "No tienes permisos para actualizar estados de pedidos" },
        { status: 403 }
      );
    }

    const { status } = await request.json();
    console.log("🔄 Recibido status:", status, "para order:", params.id);

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validar que el estado esté permitido para este rol
    if (!permissions.allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `No tienes permisos para cambiar el estado a ${status}` },
        { status: 403 }
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
        status: dbStatus,
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