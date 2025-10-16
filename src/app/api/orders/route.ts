import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth-user";
import { getSessionCookieFromRequest, verifySessionCookie } from "@/lib/auth";

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

// Función específica para emitir nuevos pedidos
function emitNewOrder(orderData: any) {
  emitSocketEvent("new-order", orderData, ["cashier", "staff-general"]);
}

export async function POST(request: NextRequest) {
  try {
    // Obtener información del usuario autenticado
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

    // Obtener el staffId
    let staffId = null;
    if (userSession) {
      // Para usuarios colaboradores, buscar su registro de staff
      const staff = await prisma.staff.findUnique({
        where: { userId: userSession.userId }
      });
      staffId = staff?.id || null;
    } else if (adminSession) {
      // Para usuarios admin, buscar si tienen un registro de staff
      // (aunque normalmente los admin no tienen registro de staff)
      staffId = null;
    }

    const body = await request.json();
    const { tableId, servicePointId, locationId, items, notes } = body;

    // Validar que se proporcione al menos una referencia de ubicación
    if ((!tableId && !servicePointId && !locationId) || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Se requiere una ubicación (tableId, servicePointId o locationId) y al menos un item" },
        { status: 400 }
      );
    }

    // Verificar que la ubicación existe y está activa
    let verifiedTable = null;
    let verifiedServicePoint = null;
    let verifiedLocation = null;

    if (tableId) {
      // Sistema legacy: verificar mesa
      verifiedTable = await prisma.table.findUnique({
        where: { id: tableId, active: true },
      });
      if (!verifiedTable) {
        return NextResponse.json(
          { error: "Mesa no encontrada o inactiva" },
          { status: 404 }
        );
      }
    } else if (servicePointId) {
      // Nuevo sistema: verificar punto de servicio
      verifiedServicePoint = await prisma.servicePoint.findUnique({
        where: { id: servicePointId, active: true },
        include: { location: true }
      });
      if (!verifiedServicePoint) {
        return NextResponse.json(
          { error: "Punto de servicio no encontrado o inactivo" },
          { status: 404 }
        );
      }
    } else if (locationId) {
      // Nuevo sistema: verificar ubicación para zonas de pie
      verifiedLocation = await prisma.location.findUnique({
        where: { id: locationId, active: true },
      });
      if (!verifiedLocation) {
        return NextResponse.json(
          { error: "Ubicación no encontrada o inactiva" },
          { status: 404 }
        );
      }
    }

    // Calcular el total
  let total = 0;
  const orderItems: any[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId, available: true },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Producto ${item.productId} no encontrado o no disponible` },
          { status: 404 }
        );
      }

      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        notes: item.notes,
      });
    }

    // Crear el pedido en una transacción
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          ...(verifiedTable?.id && { tableId: verifiedTable.id }), // Legacy support
          ...(verifiedServicePoint?.id && { servicePointId: verifiedServicePoint.id }), // New system
          ...(verifiedLocation?.id && { locationId: verifiedLocation.id }), // New system for zones
          staffId,
          status: "PENDING",
          total,
          notes,
        },
        include: {
          table: true,
          servicePoint: {
            include: { location: true }
          },
          location: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Crear los items del pedido
      await tx.orderItem.createMany({
        data: orderItems.map(item => ({
          orderId: newOrder.id,
          ...item,
        })),
      });

      return newOrder;
    });

    // Obtener el pedido completo con todas las relaciones para la respuesta
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        table: true,
        servicePoint: {
          include: { location: true }
        },
        location: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!completeOrder) {
      throw new Error("Error al obtener el pedido creado");
    }

    // Determinar el nombre de la ubicación para la notificación
    let locationName = "";
    if (completeOrder.servicePoint) {
      locationName = `${completeOrder.servicePoint.name || completeOrder.servicePoint.number} (${completeOrder.servicePoint.location.name})`;
    } else if (completeOrder.location) {
      locationName = completeOrder.location.name;
    } else if (completeOrder.table) {
      locationName = completeOrder.table.name || `Mesa ${completeOrder.table.number}`;
    }

    // Crear notificación para el staff
    await prisma.notification.create({
      data: {
        type: "ORDER_NEW",
        title: `Nuevo pedido en ${locationName}`,
        message: `Pedido de ${completeOrder.items.length} items por S/ ${total.toFixed(2)}`,
        orderId: completeOrder.id,
      },
    });

    // Emitir evento de socket para actualización en tiempo real
    emitNewOrder({
      id: completeOrder.id,
      status: completeOrder.status,
      total: completeOrder.total,
      locationName,
      itemsCount: completeOrder.items.length,
      servicePoint: completeOrder.servicePoint,
      location: completeOrder.location,
      table: completeOrder.table,
      staffId: completeOrder.staffId,
      createdAt: completeOrder.createdAt,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: completeOrder.id,
        table: completeOrder.table,
        servicePoint: completeOrder.servicePoint,
        location: completeOrder.location,
        status: completeOrder.status,
        total: completeOrder.total,
        items: completeOrder.items,
        createdAt: completeOrder.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get("tableId");

    let orders;
    if (tableId) {
      // Obtener pedidos de una mesa específica
      orders = await prisma.order.findMany({
        where: { tableId },
        include: {
          table: true,
          servicePoint: {
            include: { location: true }
          },
          location: true,
          staff: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Obtener todos los pedidos (para dashboard de staff)
      orders = await prisma.order.findMany({
        include: {
          table: true,
          servicePoint: {
            include: { location: true }
          },
          location: true,
          staff: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}