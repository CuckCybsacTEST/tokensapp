import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DateTime } from "luxon";
import { 
  updateMusicOrderStatusSchema, 
  flagMusicOrderSchema 
} from "@/lib/validations/music-order";
import { emitSocketEvent } from "../../../../../lib/socket";

const TIMEZONE = "America/Lima";

// GET - Obtener un pedido específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.musicOrder.findUnique({
      where: { id },
      include: {
        table: {
          select: { id: true, number: true, name: true, zone: true },
        },
        servicePoint: {
          select: { id: true, number: true, name: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    // Calcular posición actual en cola si está pendiente
    let queuePosition = order.queuePosition;
    if (["PENDING", "APPROVED", "QUEUED"].includes(order.status)) {
      queuePosition = await prisma.musicOrder.count({
        where: {
          status: { in: ["PENDING", "APPROVED", "QUEUED"] },
          OR: [
            { priority: { gt: order.priority } },
            {
              priority: order.priority,
              createdAt: { lt: order.createdAt },
            },
          ],
        },
      }) + 1;
    }

    return NextResponse.json({
      ok: true,
      order: { ...order, queuePosition },
    });
  } catch (error) {
    console.error("Error fetching music order:", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener pedido" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar estado de un pedido
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verificar si es una operación de flag
    if ("flagged" in body) {
      const validation = flagMusicOrderSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { ok: false, error: "Datos inválidos", details: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const order = await prisma.musicOrder.update({
        where: { id },
        data: {
          flagged: validation.data.flagged,
          flaggedReason: validation.data.flaggedReason,
        },
      });

      return NextResponse.json({ ok: true, order });
    }

    // Validar datos de actualización de estado
    const validation = updateMusicOrderStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar que el pedido existe
    const existingOrder = await prisma.musicOrder.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { ok: false, error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: any = {
      status: data.status,
      djNotes: data.djNotes,
      updatedAt: new Date(),
    };

    // Manejar estados especiales
    if (data.status === "PLAYING") {
      updateData.playedAt = new Date();
      updateData.playedBy = data.playedBy;
    }

    if (data.status === "REJECTED") {
      updateData.rejectedReason = data.rejectedReason;
    }

    // Actualizar pedido
    const order = await prisma.musicOrder.update({
      where: { id },
      data: updateData,
      include: {
        table: {
          select: { id: true, number: true, name: true, zone: true },
        },
        servicePoint: {
          select: { id: true, number: true, name: true },
        },
      },
    });

    // Emitir evento Socket.IO
    emitSocketEvent("music-order-status-update", {
      orderId: order.id,
      status: order.status,
      requesterName: order.requesterName,
      songTitle: order.songTitle,
      artist: order.artist,
      tableName: order.table?.name || order.table?.number || null,
      timestamp: new Date().toISOString(),
    });

    // Si el estado cambió a PLAYING, notificar el siguiente en cola
    if (data.status === "PLAYING") {
      const nextInQueue = await prisma.musicOrder.findFirst({
        where: {
          status: { in: ["APPROVED", "QUEUED"] },
          id: { not: id },
        },
        orderBy: [
          { priority: "desc" },
          { createdAt: "asc" },
        ],
      });

      if (nextInQueue) {
        emitSocketEvent("music-queue-update", {
          nextOrderId: nextInQueue.id,
          nextSong: nextInQueue.songTitle,
          nextArtist: nextInQueue.artist,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      order,
      message: getStatusMessage(data.status),
    });

  } catch (error) {
    console.error("Error updating music order:", error);
    return NextResponse.json(
      { ok: false, error: "Error al actualizar pedido" },
      { status: 500 }
    );
  }
}

// DELETE - Cancelar/eliminar un pedido
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.musicOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    // Si ya está reproduciéndose o reproducido, no permitir eliminar
    if (["PLAYING", "PLAYED"].includes(order.status)) {
      return NextResponse.json(
        { ok: false, error: "No se puede eliminar un pedido que ya está en reproducción" },
        { status: 400 }
      );
    }

    // Actualizar a CANCELLED en lugar de eliminar
    await prisma.musicOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    // Emitir evento
    emitSocketEvent("music-order-cancelled", {
      orderId: id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      message: "Pedido cancelado",
    });

  } catch (error) {
    console.error("Error deleting music order:", error);
    return NextResponse.json(
      { ok: false, error: "Error al cancelar pedido" },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    PENDING: "Pedido pendiente de aprobación",
    APPROVED: "Pedido aprobado",
    QUEUED: "Pedido agregado a la cola",
    PLAYING: "¡Canción reproduciéndose!",
    PLAYED: "Canción reproducida",
    REJECTED: "Pedido rechazado",
    CANCELLED: "Pedido cancelado",
  };
  return messages[status] || "Estado actualizado";
}
