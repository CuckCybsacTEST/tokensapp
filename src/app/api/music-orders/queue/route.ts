import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DateTime } from "luxon";

const TIMEZONE = "America/Lima";

// GET - Obtener estado de la cola en tiempo real
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId"); // Para obtener posición de un pedido específico

    // Obtener cola actual (pedidos pendientes, aprobados y en cola)
    const queue = await prisma.musicOrder.findMany({
      where: {
        status: { in: ["PENDING", "APPROVED", "QUEUED", "PLAYING"] },
      },
      select: {
        id: true,
        requesterName: true,
        songTitle: true,
        artist: true,
        albumImage: true,
        duration: true,
        orderType: true,
        status: true,
        priority: true,
        createdAt: true,
        table: {
          select: { number: true, name: true },
        },
      },
      orderBy: [
        { status: "asc" }, // PLAYING primero
        { priority: "desc" },
        { createdAt: "asc" },
      ],
      take: 20, // Limitar a 20 canciones en cola
    });

    // Encontrar la canción reproduciéndose actualmente
    const nowPlaying = queue.find(order => order.status === "PLAYING");
    const upNext = queue.filter(order => order.status !== "PLAYING");

    // Si se pide posición de un pedido específico
    let userPosition = null;
    let userOrder = null;
    if (orderId) {
      const orderIndex = upNext.findIndex(o => o.id === orderId);
      if (orderIndex !== -1) {
        userPosition = orderIndex + 1;
        userOrder = upNext[orderIndex];
      } else if (nowPlaying?.id === orderId) {
        userPosition = 0; // Reproduciéndose ahora
        userOrder = nowPlaying;
      }
    }

    // Calcular tiempo estimado de espera
    const avgSongDuration = 210; // 3.5 minutos promedio
    const estimatedWaitMinutes = upNext.length * (avgSongDuration / 60);

    // Estadísticas de la cola
    const stats = {
      totalInQueue: upNext.length,
      freeOrders: upNext.filter(o => o.orderType === "FREE").length,
      premiumOrders: upNext.filter(o => o.orderType === "PREMIUM").length,
      vipOrders: upNext.filter(o => o.orderType === "VIP").length,
      estimatedWaitMinutes: Math.round(estimatedWaitMinutes),
    };

    return NextResponse.json({
      ok: true,
      nowPlaying: nowPlaying || null,
      queue: upNext.slice(0, 10).map((order, index) => ({
        ...order,
        position: index + 1,
        tableName: order.table?.name || (order.table?.number ? `Mesa ${order.table.number}` : null),
      })),
      stats,
      userPosition,
      userOrder,
    });

  } catch (error) {
    console.error("Error fetching music queue:", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener cola" },
      { status: 500 }
    );
  }
}
