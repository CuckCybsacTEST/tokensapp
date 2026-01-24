import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DateTime } from "luxon";
import { 
  createMusicOrderSchema, 
  validateContent, 
  sanitizeInput 
} from "@/lib/validations/music-order";
import {
  checkRateLimit,
  recordRequest,
  checkDuplicateSong,
  isContentBlocked,
  detectSuspiciousPatterns,
} from "@/lib/music-rate-limit";
import { emitSocketEvent } from "../../../../lib/socket";

const TIMEZONE = "America/Lima";

// GET - Listar pedidos musicales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const orderType = searchParams.get("orderType");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const flagged = searchParams.get("flagged");
    const tableId = searchParams.get("tableId");
    const today = searchParams.get("today") === "true";

    // Construir filtros
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (orderType) {
      where.orderType = orderType;
    }

    if (flagged === "true") {
      where.flagged = true;
    }

    if (tableId) {
      where.tableId = tableId;
    }

    if (today) {
      const startOfDay = DateTime.now()
        .setZone(TIMEZONE)
        .startOf("day")
        .toJSDate();
      where.createdAt = { gte: startOfDay };
    }

    // Obtener pedidos
    const [orders, total] = await Promise.all([
      prisma.musicOrder.findMany({
        where,
        include: {
          table: {
            select: { id: true, number: true, name: true, zone: true },
          },
          servicePoint: {
            select: { id: true, number: true, name: true },
          },
        },
        orderBy: [
          { status: "asc" },
          { priority: "desc" },
          { createdAt: "asc" },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.musicOrder.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      orders,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching music orders:", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener pedidos" },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo pedido musical
export async function POST(request: NextRequest) {
  try {
    // Obtener IP y headers
    const ipAddress = 
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const body = await request.json();
    
    // Validar datos de entrada
    const validation = createMusicOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          ok: false, 
          error: "Datos inválidos", 
          details: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const deviceFingerprint = data.deviceFingerprint;

    // 1. Verificar si el sistema está habilitado
    const config = await prisma.musicSystemConfig.findFirst();
    if (config && !config.systemEnabled) {
      return NextResponse.json(
        { ok: false, error: "El sistema de pedidos musicales está deshabilitado" },
        { status: 503 }
      );
    }

    // 2. Verificar rate limit
    const rateLimitResult = await checkRateLimit(
      ipAddress,
      deviceFingerprint ?? undefined,
      data.orderType,
      data.tableId ?? undefined
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          ok: false, 
          error: rateLimitResult.reason,
          retryAfter: rateLimitResult.retryAfter,
          requiresCaptcha: rateLimitResult.requiresCaptcha,
        },
        { status: 429 }
      );
    }

    // 3. Validar contenido
    const titleValidation = validateContent(data.songTitle);
    if (!titleValidation.valid) {
      return NextResponse.json(
        { ok: false, error: titleValidation.reason },
        { status: 400 }
      );
    }

    const artistValidation = validateContent(data.artist);
    if (!artistValidation.valid) {
      return NextResponse.json(
        { ok: false, error: artistValidation.reason },
        { status: 400 }
      );
    }

    // 4. Verificar contenido bloqueado
    const contentBlocked = await isContentBlocked(data.artist, data.songTitle);
    if (contentBlocked.blocked) {
      return NextResponse.json(
        { ok: false, error: contentBlocked.reason },
        { status: 400 }
      );
    }

    // 5. Verificar duplicados
    const duplicateCheck = await checkDuplicateSong(
      data.spotifyId || undefined,
      data.songTitle,
      data.artist
    );

    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        { 
          ok: false, 
          error: "Esta canción ya fue pedida recientemente. Intenta con otra.",
          lastPlayedAt: duplicateCheck.lastPlayedAt,
        },
        { status: 409 }
      );
    }

    // 6. Detectar patrones sospechosos
    const suspiciousCheck = await detectSuspiciousPatterns(
      ipAddress,
      deviceFingerprint ?? undefined,
      data.artist
    );

    // 7. Calcular prioridad
    let priority = 0;
    if (data.orderType === "VIP") {
      priority = 100;
    } else if (data.orderType === "PREMIUM") {
      priority = 50;
    }

    // 8. Crear el pedido
    const order = await prisma.musicOrder.create({
      data: {
        requesterName: sanitizeInput(data.requesterName),
        whatsapp: data.whatsapp,
        songTitle: sanitizeInput(data.songTitle),
        artist: sanitizeInput(data.artist),
        spotifyId: data.spotifyId,
        spotifyUri: data.spotifyUri,
        albumName: data.albumName,
        albumImage: data.albumImage,
        duration: data.duration,
        previewUrl: data.previewUrl,
        orderType: data.orderType,
        status: data.orderType === "FREE" ? "PENDING" : "QUEUED", // Premium/VIP van directo a cola
        priority,
        deviceFingerprint,
        ipAddress,
        tableId: data.tableId,
        servicePointId: data.servicePointId,
        flagged: suspiciousCheck.suspicious,
        flaggedReason: suspiciousCheck.reason,
      },
      include: {
        table: {
          select: { id: true, number: true, name: true, zone: true },
        },
        servicePoint: {
          select: { id: true, number: true, name: true },
        },
      },
    });

    // 9. Registrar en rate limiter
    await recordRequest(ipAddress, deviceFingerprint ?? undefined, data.orderType, data.tableId ?? undefined);

    // 10. Calcular posición en cola
    const queuePosition = await prisma.musicOrder.count({
      where: {
        status: { in: ["PENDING", "APPROVED", "QUEUED"] },
        createdAt: { lt: order.createdAt },
      },
    }) + 1;

    // 11. Actualizar posición en cola
    await prisma.musicOrder.update({
      where: { id: order.id },
      data: { queuePosition },
    });

    // 12. Emitir evento Socket.IO para notificar al DJ
    emitSocketEvent("new-music-order", {
      orderId: order.id,
      requesterName: order.requesterName,
      songTitle: order.songTitle,
      artist: order.artist,
      orderType: order.orderType,
      queuePosition,
      tableName: order.table?.name || order.table?.number || null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      order: { ...order, queuePosition },
      requiresCaptcha: rateLimitResult.requiresCaptcha,
      message: data.orderType === "FREE" 
        ? "Pedido enviado. El DJ lo revisará pronto."
        : "¡Pedido premium confirmado! Tu canción estará en la cola prioritaria.",
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating music order:", error);
    return NextResponse.json(
      { ok: false, error: "Error al crear pedido" },
      { status: 500 }
    );
  }
}
