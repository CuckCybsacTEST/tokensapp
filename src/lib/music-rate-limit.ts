import { prisma } from "@/lib/prisma";
import { DateTime } from "luxon";

const TIMEZONE = "America/Lima";

// Helper para obtener timestamp actual en milisegundos
function nowTimestamp(): number {
  return Date.now();
}

// Helper para obtener Date en zona Lima actual
function nowDate(): Date {
  return new Date();
}

// Helper para calcular fecha hace X horas
function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// Helper para calcular fecha hace X minutos
function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

// Helper para calcular diferencia en segundos
function diffInSeconds(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number; // seconds
  requiresCaptcha?: boolean;
  currentCount?: number;
  limit?: number;
}

export interface RateLimitConfig {
  freeLimitPerHour: number;
  premiumLimitPerHour: number;
  tableLimitPerHour: number;
  cooldownMinutes: number;
  captchaThreshold: number;
  captchaWindowMinutes: number;
  duplicateSongHours: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  freeLimitPerHour: 3,
  premiumLimitPerHour: 10,
  tableLimitPerHour: 5,
  cooldownMinutes: 5,
  captchaThreshold: 2,
  captchaWindowMinutes: 30,
  duplicateSongHours: 2,
};

// Obtener configuración del sistema
async function getSystemConfig(): Promise<RateLimitConfig> {
  try {
    const config = await prisma.musicSystemConfig.findFirst();
    if (config) {
      return {
        freeLimitPerHour: config.freeLimitPerHour,
        premiumLimitPerHour: config.premiumLimitPerHour,
        tableLimitPerHour: config.tableLimitPerHour,
        cooldownMinutes: config.cooldownMinutes,
        captchaThreshold: config.captchaThreshold,
        captchaWindowMinutes: config.captchaWindowMinutes,
        duplicateSongHours: config.duplicateSongHours,
      };
    }
  } catch (error) {
    console.error("Error fetching music system config:", error);
  }
  return DEFAULT_CONFIG;
}

// Generar identificador único basado en IP y fingerprint
export function generateIdentifier(ipAddress?: string, deviceFingerprint?: string): string {
  const ip = ipAddress || "unknown-ip";
  const fp = deviceFingerprint || "unknown-device";
  return `${ip}:${fp}`;
}

// Verificar si un usuario está bloqueado
export async function isUserBlocked(
  identifier: string,
  ipAddress?: string,
  deviceFingerprint?: string
): Promise<{ blocked: boolean; reason?: string; expiresAt?: Date }> {
  const now = nowDate();

  const blockedUser = await prisma.musicBlockedUser.findFirst({
    where: {
      AND: [
        {
          OR: [
            { identifier },
            ...(ipAddress ? [{ ipAddress }] : []),
            ...(deviceFingerprint ? [{ deviceFingerprint }] : []),
          ],
        },
        {
          OR: [
            { permanent: true },
            { expiresAt: { gt: now } },
            { expiresAt: null },
          ],
        },
      ],
    },
  });

  if (blockedUser) {
    return {
      blocked: true,
      reason: blockedUser.reason,
      expiresAt: blockedUser.expiresAt || undefined,
    };
  }

  return { blocked: false };
}

// Verificar rate limit para un usuario/dispositivo
export async function checkRateLimit(
  ipAddress: string | undefined,
  deviceFingerprint: string | undefined,
  orderType: "FREE" | "PREMIUM" | "VIP",
  tableId?: string
): Promise<RateLimitResult> {
  const config = await getSystemConfig();
  const identifier = generateIdentifier(ipAddress, deviceFingerprint);
  const now = nowDate();
  const oneHourAgo = hoursAgo(1);
  const cooldownAgo = minutesAgo(config.cooldownMinutes);
  const captchaWindowAgo = minutesAgo(config.captchaWindowMinutes);

  // 1. Verificar si el usuario está bloqueado
  const blockStatus = await isUserBlocked(identifier, ipAddress, deviceFingerprint);
  if (blockStatus.blocked) {
    return {
      allowed: false,
      reason: `Usuario bloqueado: ${blockStatus.reason}`,
      retryAfter: blockStatus.expiresAt
        ? Math.ceil((blockStatus.expiresAt.getTime() - Date.now()) / 1000)
        : undefined,
    };
  }

  // 2. Obtener o crear registro de rate limit
  let rateLimit = await prisma.musicRateLimit.findUnique({
    where: { identifier },
  });

  if (!rateLimit) {
    rateLimit = await prisma.musicRateLimit.create({
      data: {
        identifier,
        ipAddress,
        deviceFingerprint,
        tableId,
        requestCount: 0,
        freeCount: 0,
        premiumCount: 0,
        windowStart: now,
        lastRequestAt: now,
      },
    });
  }

  // 3. Verificar si la ventana de tiempo expiró (ventana deslizante)
  if (rateLimit.windowStart < oneHourAgo) {
    // Reset de ventana
    rateLimit = await prisma.musicRateLimit.update({
      where: { identifier },
      data: {
        requestCount: 0,
        freeCount: 0,
        premiumCount: 0,
        windowStart: now,
      },
    });
  }

  // 4. Verificar cooldown (tiempo mínimo entre pedidos)
  const cooldownEnd = new Date(rateLimit.lastRequestAt.getTime() + config.cooldownMinutes * 60 * 1000);
  
  if (now < cooldownEnd) {
    const retryAfter = diffInSeconds(now, cooldownEnd);
    return {
      allowed: false,
      reason: `Debes esperar ${retryAfter} segundos antes de hacer otro pedido`,
      retryAfter,
      currentCount: rateLimit.requestCount,
    };
  }

  // 5. Verificar límites por tipo de pedido
  const limit = orderType === "FREE" 
    ? config.freeLimitPerHour 
    : config.premiumLimitPerHour;
  
  const currentCount = orderType === "FREE" 
    ? rateLimit.freeCount 
    : rateLimit.premiumCount;

  if (currentCount >= limit) {
    // Calcular tiempo hasta que la ventana se reinicie
    const windowResetTime = new Date(rateLimit.windowStart.getTime() + 60 * 60 * 1000);
    const retryAfter = diffInSeconds(now, windowResetTime);
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${limit} pedidos ${orderType === "FREE" ? "gratuitos" : "premium"} por hora`,
      retryAfter: retryAfter > 0 ? retryAfter : 0,
      currentCount,
      limit,
    };
  }

  // 6. Verificar límite por mesa/zona si aplica
  if (tableId) {
    const tableOrders = await prisma.musicOrder.count({
      where: {
        tableId,
        createdAt: { gte: oneHourAgo },
        status: { notIn: ["REJECTED", "CANCELLED"] },
      },
    });

    if (tableOrders >= config.tableLimitPerHour) {
      return {
        allowed: false,
        reason: `Esta mesa ha alcanzado el límite de ${config.tableLimitPerHour} pedidos por hora`,
        currentCount: tableOrders,
        limit: config.tableLimitPerHour,
      };
    }
  }

  // 7. Verificar si requiere captcha (muchos pedidos sin registro)
  const recentUnregisteredCount = await prisma.musicOrder.count({
    where: {
      OR: [
        { ipAddress: ipAddress },
        { deviceFingerprint: deviceFingerprint },
      ],
      userId: null,
      createdAt: { gte: captchaWindowAgo },
    },
  });

  const requiresCaptcha = recentUnregisteredCount >= config.captchaThreshold;

  return {
    allowed: true,
    requiresCaptcha,
    currentCount: currentCount + 1,
    limit,
  };
}

// Registrar un pedido en el rate limiter
export async function recordRequest(
  ipAddress: string | undefined,
  deviceFingerprint: string | undefined,
  orderType: "FREE" | "PREMIUM" | "VIP",
  tableId?: string
): Promise<void> {
  const identifier = generateIdentifier(ipAddress, deviceFingerprint);
  const now = nowDate();

  await prisma.musicRateLimit.upsert({
    where: { identifier },
    create: {
      identifier,
      ipAddress,
      deviceFingerprint,
      tableId,
      requestCount: 1,
      freeCount: orderType === "FREE" ? 1 : 0,
      premiumCount: orderType !== "FREE" ? 1 : 0,
      lastRequestAt: now,
      windowStart: now,
    },
    update: {
      requestCount: { increment: 1 },
      freeCount: orderType === "FREE" ? { increment: 1 } : undefined,
      premiumCount: orderType !== "FREE" ? { increment: 1 } : undefined,
      lastRequestAt: now,
      tableId: tableId || undefined,
    },
  });
}

// Verificar duplicados (misma canción en las últimas X horas)
export async function checkDuplicateSong(
  spotifyId: string | undefined,
  songTitle: string,
  artist: string
): Promise<{ isDuplicate: boolean; lastPlayedAt?: Date }> {
  const config = await getSystemConfig();
  const duplicateWindow = hoursAgo(config.duplicateSongHours || 2);

  // Buscar por spotifyId si está disponible, o por título + artista
  const recentOrder = await prisma.musicOrder.findFirst({
    where: {
      createdAt: { gte: duplicateWindow },
      status: { notIn: ["REJECTED", "CANCELLED"] },
      OR: [
        ...(spotifyId ? [{ spotifyId }] : []),
        {
          AND: [
            { songTitle: { equals: songTitle, mode: "insensitive" as const } },
            { artist: { equals: artist, mode: "insensitive" as const } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentOrder) {
    return {
      isDuplicate: true,
      lastPlayedAt: recentOrder.createdAt,
    };
  }

  return { isDuplicate: false };
}

// Verificar si el artista o canción está bloqueado
export async function isContentBlocked(
  artist: string,
  songTitle: string
): Promise<{ blocked: boolean; reason?: string }> {
  const config = await prisma.musicSystemConfig.findFirst();
  
  if (!config) {
    return { blocked: false };
  }

  const lowerArtist = artist.toLowerCase();
  const lowerSong = songTitle.toLowerCase();

  // Verificar artistas bloqueados
  if (config.blockedArtists && config.blockedArtists.length > 0) {
    for (const blockedArtist of config.blockedArtists) {
      if (lowerArtist.includes(blockedArtist.toLowerCase())) {
        return { blocked: true, reason: "Este artista no está disponible" };
      }
    }
  }

  // Verificar canciones bloqueadas
  if (config.blockedSongs && config.blockedSongs.length > 0) {
    for (const blockedSong of config.blockedSongs) {
      if (lowerSong.includes(blockedSong.toLowerCase())) {
        return { blocked: true, reason: "Esta canción no está disponible" };
      }
    }
  }

  return { blocked: false };
}

// Detectar patrones sospechosos (ej: mismo artista repetido)
export async function detectSuspiciousPatterns(
  ipAddress: string | undefined,
  deviceFingerprint: string | undefined,
  artist: string
): Promise<{ suspicious: boolean; reason?: string }> {
  const identifier = generateIdentifier(ipAddress, deviceFingerprint);
  const oneHourAgo = hoursAgo(1);

  // Contar pedidos del mismo artista en la última hora
  const sameArtistCount = await prisma.musicOrder.count({
    where: {
      OR: [
        { ipAddress },
        { deviceFingerprint },
      ],
      artist: { equals: artist, mode: "insensitive" },
      createdAt: { gte: oneHourAgo },
    },
  });

  // Si más de 3 pedidos del mismo artista en 1 hora, es sospechoso
  if (sameArtistCount >= 3) {
    return {
      suspicious: true,
      reason: `Demasiados pedidos del mismo artista (${sameArtistCount} en la última hora)`,
    };
  }

  return { suspicious: false };
}

// Bloquear un usuario
export async function blockUser(
  identifier: string,
  reason: string,
  blockedBy: string,
  options?: {
    ipAddress?: string;
    deviceFingerprint?: string;
    expiresAt?: Date;
    permanent?: boolean;
  }
): Promise<void> {
  await prisma.musicBlockedUser.create({
    data: {
      identifier,
      ipAddress: options?.ipAddress,
      deviceFingerprint: options?.deviceFingerprint,
      reason,
      blockedBy,
      expiresAt: options?.expiresAt,
      permanent: options?.permanent || false,
    },
  });
}

// Desbloquear un usuario
export async function unblockUser(identifier: string): Promise<void> {
  await prisma.musicBlockedUser.deleteMany({
    where: { identifier },
  });
}
