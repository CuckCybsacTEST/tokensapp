import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth-user";
import { getSessionCookieFromRequest, verifySessionCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación con user_session o admin_session
    const userCookie = getUserSessionCookieFromRequest(request);
    const userSession = await verifyUserSessionCookie(userCookie);

    const adminCookie = getSessionCookieFromRequest(request);
    const adminSession = await verifySessionCookie(adminCookie);

    if (!userSession && !adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const zone = searchParams.get("zone");

    // Build date filter
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) dateFilter.createdAt.gte = new Date(dateFrom);
      if (dateTo) dateFilter.createdAt.lte = new Date(dateTo);
    }

    // Get all staff with their orders
    const staffWithOrders = await prisma.staff.findMany({
      where: {
        active: true,
        ...(zone && { zones: { has: zone } })
      },
      include: {
        orders: {
          where: dateFilter,
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    // Calculate metrics for each staff member
    const staffMetrics = staffWithOrders.map(staff => {
      const orders = staff.orders;
      const totalOrders = orders.length;
      const deliveredOrders = orders.filter(o => o.status === "DELIVERED").length;
      const pendingOrders = orders.filter(o => o.status === "PENDING" || o.status === "CONFIRMED").length;
      const cancelledOrders = orders.filter(o => o.status === "CANCELLED").length;

      // Calculate total revenue
      const totalRevenue = orders.reduce((sum, order) => {
        return sum + order.items.reduce((itemSum, item) => {
          return itemSum + (item.price * item.quantity);
        }, 0);
      }, 0);

      // Calculate average delivery time (for delivered orders)
      const deliveredOrdersWithTimes = orders.filter(o =>
        o.status === "DELIVERED" && o.createdAt && o.deliveredAt
      );

      const avgDeliveryTime = deliveredOrdersWithTimes.length > 0
        ? deliveredOrdersWithTimes.reduce((sum, order) => {
            const deliveryTime = new Date(order.deliveredAt!).getTime() - new Date(order.createdAt).getTime();
            return sum + deliveryTime;
          }, 0) / deliveredOrdersWithTimes.length / (1000 * 60) // Convert to minutes
        : 0;

      // Orders by status
      const ordersByStatus = {
        PENDING: orders.filter(o => o.status === "PENDING").length,
        CONFIRMED: orders.filter(o => o.status === "CONFIRMED").length,
        PREPARING: orders.filter(o => o.status === "PREPARING").length,
        READY: orders.filter(o => o.status === "READY").length,
        DELIVERED: orders.filter(o => o.status === "DELIVERED").length,
        CANCELLED: orders.filter(o => o.status === "CANCELLED").length,
      };

      return {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        zones: staff.zones,
        metrics: {
          totalOrders,
          deliveredOrders,
          pendingOrders,
          cancelledOrders,
          totalRevenue,
          avgDeliveryTime: Math.round(avgDeliveryTime * 10) / 10, // Round to 1 decimal
          ordersByStatus,
          successRate: totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0
        }
      };
    });

    // Sort by total orders (most active first)
    staffMetrics.sort((a, b) => b.metrics.totalOrders - a.metrics.totalOrders);

    return NextResponse.json({
      staffMetrics,
      summary: {
        totalStaff: staffMetrics.length,
        totalOrders: staffMetrics.reduce((sum, s) => sum + s.metrics.totalOrders, 0),
        totalRevenue: staffMetrics.reduce((sum, s) => sum + s.metrics.totalRevenue, 0),
        avgDeliveryTime: staffMetrics.length > 0
          ? Math.round(staffMetrics.reduce((sum, s) => sum + s.metrics.avgDeliveryTime, 0) / staffMetrics.length * 10) / 10
          : 0
      }
    });

  } catch (error) {
    console.error("Error fetching staff metrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}