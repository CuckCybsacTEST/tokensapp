/**
 * Sistema de rate limiting específico para trivia
 * Aislado del sistema principal de rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

// Store en memoria para rate limiting (reinicia con el servidor)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Verifica si una solicitud excede el rate limit
 */
export function checkTriviaRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { ok: boolean; retryAfterSeconds?: number; remainingRequests?: number } {
  const now = Date.now();
  const windowKey = `${key}:${Math.floor(now / windowMs)}`;

  const current = rateLimitStore.get(windowKey) || {
    count: 0,
    resetTime: now + windowMs,
    lastRequest: now
  };

  // Si la ventana expiró, resetear
  if (now > current.resetTime) {
    current.count = 0;
    current.resetTime = now + windowMs;
    current.lastRequest = now;
  }

  // Verificar si excede el límite
  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((current.resetTime - now) / 1000);
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, retryAfterSeconds)
    };
  }

  // Incrementar contador
  current.count++;
  current.lastRequest = now;
  rateLimitStore.set(windowKey, current);

  const remainingRequests = maxRequests - current.count;

  return {
    ok: true,
    remainingRequests
  };
}

/**
 * Rate limiting específico para respuestas de trivia
 * 10 respuestas por minuto por sesión/IP
 */
export function checkTriviaAnswerRateLimit(
  sessionId: string,
  ip: string
): { ok: boolean; retryAfterSeconds?: number } {
  // Rate limit por sesión: 10 respuestas por minuto
  const sessionLimit = checkTriviaRateLimit(
    `trivia-session:${sessionId}`,
    10, // 10 respuestas
    60000 // por minuto
  );

  if (!sessionLimit.ok) {
    return sessionLimit;
  }

  // Rate limit por IP: 20 respuestas por minuto (para prevenir abuso)
  const ipLimit = checkTriviaRateLimit(
    `trivia-ip:${ip}`,
    20, // 20 respuestas
    60000 // por minuto
  );

  if (!ipLimit.ok) {
    return ipLimit;
  }

  return { ok: true };
}

/**
 * Rate limiting para iniciar sesiones de trivia
 * 5 sesiones por hora por IP
 */
export function checkTriviaSessionRateLimit(ip: string): { ok: boolean; retryAfterSeconds?: number } {
  return checkTriviaRateLimit(
    `trivia-session-start:${ip}`,
    5, // 5 sesiones
    3600000 // por hora
  );
}

/**
 * Limpia entradas expiradas del store (mantenimiento)
 * Se puede llamar periódicamente para liberar memoria
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => rateLimitStore.delete(key));

  return keysToDelete.length; // Retorna cantidad de entradas limpiadas
}

/**
 * Obtiene estadísticas del rate limiting (para debugging)
 */
export function getRateLimitStats() {
  const now = Date.now();
  const stats = {
    totalEntries: rateLimitStore.size,
    activeEntries: 0,
    expiredEntries: 0,
    entriesByType: {} as Record<string, number>
  };

  for (const [key, entry] of rateLimitStore.entries()) {
    const type = key.split(':')[0];
    stats.entriesByType[type] = (stats.entriesByType[type] || 0) + 1;

    if (now > entry.resetTime) {
      stats.expiredEntries++;
    } else {
      stats.activeEntries++;
    }
  }

  return stats;
}