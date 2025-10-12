import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth-user";
import { getSessionCookieFromRequest, verifySessionCookie } from "@/lib/auth";

const prisma = new PrismaClient();

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
    const { tableId, items, notes } = body;

    if (!tableId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Se requiere tableId y al menos un item" },
        { status: 400 }
      );
    }

    // Verificar que la mesa existe y está activa
    const table = await prisma.table.findUnique({
      where: { id: tableId, active: true },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Mesa no encontrada o inactiva" },
        { status: 404 }
      );
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
          tableId,
          staffId,
          status: "PENDING",
          total,
          notes,
        },
        include: {
          table: true,
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

    // Crear notificación para el staff
    await prisma.notification.create({
      data: {
        type: "ORDER_NEW",
        title: `Nuevo pedido en ${table.name || `Mesa ${table.number}`}`,
        message: `Pedido de ${order.items.length} items por S/ ${total.toFixed(2)}`,
        orderId: order.id,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        table: order.table,
        status: order.status,
        total: order.total,
        items: order.items,
        createdAt: order.createdAt,
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