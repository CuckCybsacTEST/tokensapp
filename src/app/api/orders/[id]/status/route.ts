import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth-user";
import { getSessionCookieFromRequest, verifySessionCookie } from "@/lib/auth";
import { mapAreaToStaffRole, getStaffPermissions } from "@/lib/staff-roles";
import { isValidArea } from "@/lib/areas";

// Función para emitir eventos de socket desde APIs
function emitSocketEvent(event: string, data: any, rooms?: string[]) {
  try {
    const io = (global as any).io;
    if (io) {
      if (rooms && rooms.length > 0) {
        rooms.forEach(room => {
          io.to(room).emit(event, data);
        });
      } else {
        io.emit(event, data);
      }
      console.log(`📡 Evento '${event}' emitido:`, data);
    } else {
      console.warn("⚠️ Socket.IO no está disponible para emitir eventos");
    }
  } catch (error) {
    console.error("❌ Error al emitir evento de socket:", error);
  }
}

// Función específica para emitir actualizaciones de estado de pedidos
function emitOrderStatusUpdate(orderData: any) {
  const rooms = ["cashier", "staff-general"];
  if (orderData.staffId) {
    rooms.push(`staff-${orderData.staffId}`);
  }
  if (orderData.tableId) {
    rooms.push(`table-${orderData.tableId}`);
  }
  if (orderData.servicePoint?.id) {
    rooms.push(`service-point-${orderData.servicePoint.id}`);
  }
  if (orderData.location?.id) {
    rooms.push(`location-${orderData.location.id}`);
  }
  emitSocketEvent("order-status-update", orderData, rooms);
}

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
        servicePoint: {
          include: { location: true }
        },
        location: true,
        staff: true,
      },
    });

    // Emitir evento de socket para actualización en tiempo real
    emitOrderStatusUpdate({
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      tableId: updatedOrder.tableId,
      staffId: updatedOrder.staffId,
      servicePoint: updatedOrder.servicePoint,
      location: updatedOrder.location,
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