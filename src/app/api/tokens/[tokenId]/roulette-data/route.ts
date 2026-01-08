import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemConfig } from '@/lib/config';
import { computeTokensEnabled } from '@/lib/tokensMode';
import { apiError, apiOk } from '@/lib/apiError';
import { DateTime } from 'luxon';

// Helper function to retry database operations
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 2, delay = 100): Promise<T> {
  let lastError: Error;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError!;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = params.tokenId;
    let bypassDisabled = false;
    
    // Verificar que el sistema está habilitado por interruptor Y dentro de ventana horaria
    const cfg = await withRetry(() => getSystemConfig(true));
    const tz = process.env.TOKENS_TIMEZONE || 'America/Lima';
    const scheduled = computeTokensEnabled({ now: new Date(), tz });
    const allowedBySwitch = cfg.tokensEnabled;
    const allowedBySchedule = scheduled.enabled; // 18:00-00:00
    console.log(`[roulette-data] Token ${tokenId}: switch=${allowedBySwitch ? 'ON' : 'OFF'} scheduled=${allowedBySchedule ? 'OPEN' : 'CLOSED'} tz=${tz}`);
    // Option B: Si el interruptor está ON, permitimos aunque estemos fuera del horario (override manual temporal)
    if (!allowedBySwitch) {
      console.log(`[roulette-data] Rechazando token ${tokenId}: system OFF (override not active)`);
      return apiError('SYSTEM_OFF','El sistema de tokens está desactivado temporalmente.',{ status: 'disabled' },403);
    }
    // allowedBySwitch === true: se permite aunque scheduled.enabled sea false; añadimos log informativo
    if (!allowedBySchedule) {
      console.log(`[roulette-data] Permitido por override manual fuera de ventana horaria (switch ON, scheduled CLOSED)`);
    }
    
    // Optimized query: get token with prize and batch info in one go
    const token = await withRetry(() => prisma.token.findUnique({
      where: { id: tokenId },
      include: { 
        prize: true,
        batch: {
          include: {
            tokens: {
              where: {
                redeemedAt: null,
                disabled: false,
                expiresAt: { gt: new Date() },
              },
              include: { prize: true }
            }
          }
        }
      },
    }));

    if (!token) {
      return apiError('NOT_FOUND','Token no encontrado',undefined,404);
    }
    
    // Si es un bi-token (retry), buscar el token real asociado
    let realToken = null;
    if (token.prize.key === 'retry' && token.pairedNextTokenId) {
      realToken = await withRetry(() => prisma.token.findUnique({
        where: { id: token.pairedNextTokenId! },
        select: {
          id: true,
          revealedAt: true,
          deliveredAt: true,
          redeemedAt: true,
        },
      }));
    }
    
    // Verificar si el token ya fue utilizado, expirado o está deshabilitado
    if (token.redeemedAt) {
      return apiOk({ token: serializeToken(token), message: 'Token ya canjeado' });
    }
    
    // Si el token está reservado por bi-token (referenciado por algún retry NO revelado), bloquear acceso directo a ruleta
    const reservedAny = await withRetry(() => prisma.$queryRaw<Array<{ id: string }>>`
      SELECT t.id FROM "Token" t
      JOIN "Prize" p ON p.id = t."prizeId"
      WHERE p.key = 'retry' AND t."pairedNextTokenId" = ${token.id} AND t."revealedAt" IS NULL
      LIMIT 1
    `);
    if ((reservedAny as any[]).length > 0 && !token.disabled) {
      const serialized = serializeToken(token) as any;
      serialized.reservedByRetry = true;
      return apiOk({ token: serialized, message: 'Token inactivo' });
    }

    if (token.disabled || !token.prize.active) {
      if (token.disabled) {
        // Bypass: permitir ruleta si este token está reservado por un retry ya revelado
        const rows = await withRetry(() => prisma.$queryRaw<Array<{ id: string }>>`
          SELECT t.id FROM "Token" t
          JOIN "Prize" p ON p.id = t."prizeId"
          WHERE p.key = 'retry' AND t."pairedNextTokenId" = ${token.id} AND t."revealedAt" IS NOT NULL
          LIMIT 1
        `);
        if (rows.length > 0) {
          // continuar flujo de ruleta pese a disabled
          bypassDisabled = true;
        } else {
          return apiOk({ token: serializeToken(token), message: 'Token inactivo' });
        }
      } else {
        return apiOk({ token: serializeToken(token), message: 'Token inactivo' });
      }
    }
    
    if (Date.now() > token.expiresAt.getTime()) {
      return apiOk({ token: serializeToken(token), message: 'Token expirado' });
    }
    
    // Use the pre-fetched batch tokens instead of separate groupBy query
    const batchTokens = token.batch?.tokens || [];
    const prizeMap = new Map();
    batchTokens.forEach(t => {
      const prizeId = t.prizeId;
      if (!prizeMap.has(prizeId)) {
        prizeMap.set(prizeId, {
          prizeId,
          label: t.prize.label,
          color: t.prize.color || null,
          count: 0,
          key: t.prize.key
        });
      }
      prizeMap.get(prizeId).count++;
    });
    
    let elements = Array.from(prizeMap.values());
    
    // Garantizar que el premio de este token esté incluido
    if (!elements.find((e) => e.prizeId === token.prizeId)) {
      elements.push({
        prizeId: token.prizeId,
        label: token.prize.label,
        color: token.prize.color || null,
        count: 1,
        key: token.prize.key,
      });
    }
    
    // Reglas: la ruleta sólo es válida con 2 o más elementos
    if (elements.length < 2) {
      return apiError('NOT_ENOUGH_ELEMENTS','La ruleta requiere al menos 2 premios disponibles.',{ token: serializeToken(token), elements, status: 'not-enough-elements' },400);
    }
    
    const serialized = serializeToken(token);
    if (bypassDisabled) {
      (serialized as any).disabled = false;
      (serialized as any).reservedByRetry = true;
      (serialized as any).availableFrom = null;
    }
    // Si existe realToken, adjuntarlo al objeto serializado
    if (realToken) {
      (serialized as any).realToken = {
        id: realToken.id,
        revealedAt: realToken.revealedAt ? realToken.revealedAt.toISOString() : null,
        deliveredAt: realToken.deliveredAt ? realToken.deliveredAt.toISOString() : null,
        redeemedAt: realToken.redeemedAt ? realToken.redeemedAt.toISOString() : null,
      };
    }
    return apiOk({ token: serialized, elements });
  } catch (error) {
    console.error("API error:", error);
    return apiError('INTERNAL_ERROR', 'Error procesando la solicitud', null, 500);
  }
}

// Función auxiliar para serializar un token
function serializeToken(token: any) {
  let availableFrom: string | null = null;
  try {
    // Derivamos el inicio del día a partir de expiresAt (que en singleDay es fin de día)
    const exp = DateTime.fromISO(new Date(token.expiresAt).toISOString(), { zone: 'system' });
    if (exp.isValid) availableFrom = exp.startOf('day').toISO();
  } catch {}
  return {
    id: token.id,
    expiresAt: token.expiresAt.toISOString(),
    redeemedAt: token.redeemedAt ? token.redeemedAt.toISOString() : null,
    revealedAt: token.revealedAt ? token.revealedAt.toISOString() : null,
    deliveredAt: token.deliveredAt ? token.deliveredAt.toISOString() : null,
    disabled: token.disabled,
    availableFrom,
    batchId: token.batchId,
    prize: {
      id: token.prize.id,
      key: token.prize.key,
      label: token.prize.label,
      color: token.prize.color || null,
      active: token.prize.active,
    },
  };
}
