import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk } from '@/lib/apiError';

// GET /api/tokens/[tokenId]/wait-ready
// Long polling endpoint that waits for functional token to be ready
// Returns when token is enabled (disabled: false, not reserved)

const MAX_WAIT_MS = 10000;      // tiempo máximo de long polling (10 s)
const CHECK_INTERVAL_MS = 100;  // intervalo entre consultas a DB (100 ms)
export async function GET(_req: NextRequest, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  if (!tokenId) return apiError('TOKEN_ID_REQUIRED', 'tokenId requerido', undefined, 400);

  const maxWaitMs = MAX_WAIT_MS;
  const checkIntervalMs = CHECK_INTERVAL_MS;
  const startTime = Date.now();

  console.log(`🔄 [wait-ready] Iniciando long polling para token: ${tokenId}`);

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const token = await prisma.token.findUnique({
        where: { id: tokenId },
        select: {
          id: true,
          disabled: true,
          expiresAt: true,
          prize: { select: { key: true } }
        }
      });

      if (!token) {
        console.warn(`⚠️ [wait-ready] Token ${tokenId} no encontrado`);
        return apiError('TOKEN_NOT_FOUND', 'Token no encontrado', undefined, 404);
      }

      // Check if token is expired
      if (Date.now() > token.expiresAt.getTime()) {
        console.warn(`⚠️ [wait-ready] Token ${tokenId} expirado`);
        return apiError('TOKEN_EXPIRED', 'Token expirado', undefined, 410);
      }

      const isDisabled = token.disabled;

      console.log(`📊 [wait-ready] Token ${tokenId}: disabled=${isDisabled}, elapsed=${Date.now() - startTime}ms`);

      // Token is ready if NOT disabled
      if (!isDisabled) {
        console.log(`✅ [wait-ready] Token ${tokenId} listo después de ${Date.now() - startTime}ms`);
        return apiOk({
          ready: true,
          tokenId: token.id,
          prizeKey: token.prize?.key,
          waitedMs: Date.now() - startTime
        });
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));

    } catch (error) {
      console.error(`❌ [wait-ready] Error verificando token ${tokenId}:`, error);
      return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
    }
  }

  // Timeout reached
  console.warn(`⏰ [wait-ready] Timeout alcanzado para token ${tokenId} (${maxWaitMs}ms)`);
  return apiError('TIMEOUT', 'Timeout esperando token', { waitedMs: maxWaitMs }, 408);
}