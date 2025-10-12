import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth-user";
import { getSessionCookieFromRequest, verifySessionCookie } from "@/lib/auth";
import { mapAreaToStaffRole, getStaffPermissions } from "@/lib/staff-roles";
import { isValidArea } from "@/lib/areas";

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación con user_session o admin_session
    const userCookie = getUserSessionCookieFromRequest(request);
    const userSession = await verifyUserSessionCookie(userCookie);
    
    const adminCookie = getSessionCookieFromRequest(request);
    const adminSession = await verifySessionCookie(adminCookie);

    if (!userSession && !adminSession) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    let user = null;
    let restaurantRole = null;
    let validArea = null;
    let permissions = null;

    if (adminSession) {
      // Si hay sesión de admin, darle acceso completo como ADMIN
      restaurantRole = 'ADMIN';
      permissions = getStaffPermissions('ADMIN');
    } else if (userSession) {
      // Obtener perfil del usuario
      user = await prisma.user.findUnique({
        where: { id: userSession.userId },
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
      validArea = userArea && isValidArea(userArea) ? userArea : null;
      restaurantRole = mapAreaToStaffRole(validArea);

      if (!restaurantRole) {
        return NextResponse.json(
          { error: "No tienes acceso al sistema de restaurante" },
          { status: 403 }
        );
      }

      permissions = getStaffPermissions(restaurantRole);
    }

    if (!permissions || !permissions.canUpdateOrderStatus) {
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
    if (permissions && !permissions.allowedStatuses.includes(status)) {
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

    // Mapear status a formato de base de datos (Prisma espera valores en inglés)
    const statusMapping: { [key: string]: string } = {
      "PENDING": "PENDING",
      "CONFIRMED": "CONFIRMED", 
      "PREPARING": "PREPARING",
      "READY": "READY",
      "DELIVERED": "DELIVERED",
      "CANCELLED": "CANCELLED",
      "pendiente": "PENDING",
      "confirmado": "CONFIRMED",
      "preparando": "PREPARING",
      "listo": "READY",
      "entregado": "DELIVERED",
      "cancelado": "CANCELLED"
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