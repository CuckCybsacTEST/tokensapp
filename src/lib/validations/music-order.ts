import { z } from "zod";

// Schema para crear un pedido musical
export const createMusicOrderSchema = z.object({
  requesterName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .trim(),
  whatsapp: z
    .string()
    .regex(/^(\+?51)?[0-9]{9}$/, "Número de WhatsApp inválido")
    .optional()
    .nullable(),
  songTitle: z
    .string()
    .min(1, "El título de la canción es requerido")
    .max(200, "El título no puede exceder 200 caracteres")
    .trim(),
  artist: z
    .string()
    .min(1, "El artista es requerido")
    .max(200, "El nombre del artista no puede exceder 200 caracteres")
    .trim(),
  spotifyId: z.string().optional().nullable(),
  spotifyUri: z.string().optional().nullable(),
  albumName: z.string().max(200).optional().nullable(),
  albumImage: z.string().url().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  previewUrl: z.string().url().optional().nullable(),
  orderType: z.enum(["FREE", "PREMIUM", "VIP"]).default("FREE"),
  tableId: z.string().cuid().optional().nullable(),
  servicePointId: z.string().cuid().optional().nullable(),
  deviceFingerprint: z.string().optional().nullable(),
});

export type CreateMusicOrderInput = z.infer<typeof createMusicOrderSchema>;

// Schema para actualizar el estado de un pedido
export const updateMusicOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "APPROVED",
    "QUEUED",
    "PLAYING",
    "PLAYED",
    "REJECTED",
    "CANCELLED",
  ]),
  djNotes: z.string().max(500).optional().nullable(),
  rejectedReason: z.string().max(500).optional().nullable(),
  playedBy: z.string().optional().nullable(),
});

export type UpdateMusicOrderStatusInput = z.infer<typeof updateMusicOrderStatusSchema>;

// Schema para marcar un pedido como flagged
export const flagMusicOrderSchema = z.object({
  flagged: z.boolean(),
  flaggedReason: z.string().max(500).optional().nullable(),
});

export type FlagMusicOrderInput = z.infer<typeof flagMusicOrderSchema>;

// Schema para bloquear un usuario
export const blockUserSchema = z.object({
  identifier: z.string().min(1, "Identificador requerido"),
  ipAddress: z.string().optional().nullable(),
  deviceFingerprint: z.string().optional().nullable(),
  reason: z.string().min(1, "Razón del bloqueo requerida").max(500),
  expiresAt: z.string().datetime().optional().nullable(),
  permanent: z.boolean().default(false),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;

// Schema para configuración del sistema
export const musicSystemConfigSchema = z.object({
  systemEnabled: z.boolean().optional(),
  qrEnabled: z.boolean().optional(),
  premiumPrice: z.number().min(0).optional(),
  vipPrice: z.number().min(0).optional(),
  freeLimitPerHour: z.number().int().min(1).max(100).optional(),
  premiumLimitPerHour: z.number().int().min(1).max(100).optional(),
  tableLimitPerHour: z.number().int().min(1).max(100).optional(),
  cooldownMinutes: z.number().int().min(0).max(60).optional(),
  captchaThreshold: z.number().int().min(1).max(10).optional(),
  captchaWindowMinutes: z.number().int().min(5).max(120).optional(),
  duplicateSongHours: z.number().int().min(0).max(24).optional(),
  peakHourMultiplier: z.number().min(1).max(5).optional(),
  peakHourStart: z.number().int().min(0).max(23).optional(),
  peakHourEnd: z.number().int().min(0).max(23).optional(),
  eventModeEnabled: z.boolean().optional(),
  eventModeLimits: z.record(z.any()).optional().nullable(),
  blockedArtists: z.array(z.string()).optional(),
  blockedSongs: z.array(z.string()).optional(),
});

export type MusicSystemConfigInput = z.infer<typeof musicSystemConfigSchema>;

// Lista de palabras bloqueadas para content filter
export const BLOCKED_WORDS: string[] = [
  // Agregar palabras inapropiadas según necesidad
];

// Función para validar contenido
export function validateContent(text: string): { valid: boolean; reason?: string } {
  const lowerText = text.toLowerCase();
  
  for (const word of BLOCKED_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      return { valid: false, reason: "Contenido inapropiado detectado" };
    }
  }
  
  return { valid: true };
}

// Función para sanitizar input
export function sanitizeInput(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ") // Múltiples espacios a uno
    .substring(0, 200); // Limitar longitud
}
