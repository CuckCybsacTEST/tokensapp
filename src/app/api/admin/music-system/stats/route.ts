import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DateTime } from "luxon";

const TIMEZONE = "America/Lima";

// GET - Obtener estadísticas del día
export async function GET() {
  try {
    const startOfDay = DateTime.now()
      .setZone(TIMEZONE)
      .startOf("day")
      .toJSDate();

    const [
      totalToday,
      freeToday,
      premiumToday,
      vipToday,
      playedToday,
      rejectedToday,
      paidOrders,
    ] = await Promise.all([
      // Total hoy
      prisma.musicOrder.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      // Gratuitos hoy
      prisma.musicOrder.count({
        where: { createdAt: { gte: startOfDay }, orderType: "FREE" },
      }),
      // Premium hoy
      prisma.musicOrder.count({
        where: { createdAt: { gte: startOfDay }, orderType: "PREMIUM" },
      }),
      // VIP hoy
      prisma.musicOrder.count({
        where: { createdAt: { gte: startOfDay }, orderType: "VIP" },
      }),
      // Reproducidas hoy
      prisma.musicOrder.count({
        where: { createdAt: { gte: startOfDay }, status: "PLAYED" },
      }),
      // Rechazados hoy
      prisma.musicOrder.count({
        where: { createdAt: { gte: startOfDay }, status: "REJECTED" },
      }),
      // Revenue hoy (órdenes pagadas)
      prisma.musicOrder.findMany({
        where: {
          createdAt: { gte: startOfDay },
          isPaid: true,
          paidAmount: { not: null },
        },
        select: { paidAmount: true },
      }),
    ]);

    const revenueToday = paidOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);

    return NextResponse.json({
      ok: true,
      stats: {
        totalToday,
        freeToday,
        premiumToday,
        vipToday,
        playedToday,
        rejectedToday,
        revenueToday,
      },
    });
  } catch (error) {
    console.error("Error fetching music stats:", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
