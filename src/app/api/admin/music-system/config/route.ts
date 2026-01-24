import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { musicSystemConfigSchema } from "@/lib/validations/music-order";

// GET - Obtener configuración del sistema
export async function GET() {
  try {
    let config = await prisma.musicSystemConfig.findFirst();

    // Si no existe, crear configuración por defecto
    if (!config) {
      config = await prisma.musicSystemConfig.create({
        data: {
          systemEnabled: true,
          qrEnabled: true,
          premiumPrice: 5.0,
          vipPrice: 10.0,
          freeLimitPerHour: 3,
          premiumLimitPerHour: 10,
          tableLimitPerHour: 5,
          cooldownMinutes: 5,
          captchaThreshold: 2,
          captchaWindowMinutes: 30,
          duplicateSongHours: 2,
          peakHourMultiplier: 1.5,
          peakHourStart: 22,
          peakHourEnd: 2,
          eventModeEnabled: false,
          blockedArtists: [],
          blockedSongs: [],
        },
      });
    }

    return NextResponse.json({
      ok: true,
      config,
    });
  } catch (error) {
    console.error("Error fetching music system config:", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar configuración
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = musicSystemConfigSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: "Datos inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Buscar configuración existente
    let config = await prisma.musicSystemConfig.findFirst();

    // Preparar datos para Prisma, manejando el campo JSON eventModeLimits
    const updateData = {
      ...validation.data,
      // Si eventModeLimits es null o undefined, usar Prisma.JsonNull o undefined
      eventModeLimits: validation.data.eventModeLimits === null 
        ? Prisma.JsonNull 
        : validation.data.eventModeLimits,
    };

    if (config) {
      config = await prisma.musicSystemConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    } else {
      config = await prisma.musicSystemConfig.create({
        data: updateData as any,
      });
    }

    return NextResponse.json({
      ok: true,
      config,
    });
  } catch (error) {
    console.error("Error updating music system config:", error);
    return NextResponse.json(
      { ok: false, error: "Error al actualizar configuración" },
      { status: 500 }
    );
  }
}
