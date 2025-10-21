import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTwoPhaseRedemptionEnabled } from "@/lib/featureFlags";
import { logEvent } from "@/lib/log";
import { apiError, apiOk } from '@/lib/apiError';

// POST /api/token/[tokenId]/reveal
// Body: { prizeId?: string }
// Errors: TOKEN_NOT_FOUND, TWO_PHASE_DISABLED, ALREADY_REVEALED, INACTIVE, EXPIRED
export async function POST(_req: NextRequest, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  if (!tokenId) return apiError('TOKEN_ID_REQUIRED', 'tokenId requerido', undefined, 400);

  const twoPhase = isTwoPhaseRedemptionEnabled();
  if (!twoPhase) return apiError('TWO_PHASE_DISABLED', 'Flujo two-phase desactivado', undefined, 409);

  try {
    const body = await _req.json().catch(() => ({}));
    const requestedPrizeId = body?.prizeId;

    const result = await prisma.$transaction(async (tx: any) => {
      const token = await tx.token.findUnique({ where: { id: tokenId }, include: { prize: true } });
      if (!token) return { status: 404, body: { code: 'TOKEN_NOT_FOUND', message: 'Token no encontrado' } } as const;
      // Allow reveal of a disabled token only if it was reserved by a revealed retry (paired bi-token)
      if (token.disabled) {
        const reservedByRetry = await tx.token.findFirst({
          where: {
            pairedNextTokenId: token.id,
            revealedAt: { not: null },
            prize: { is: { key: 'retry' } },
          },
          select: { id: true },
        });
        if (!reservedByRetry) {
          return { status: 410, body: { code: 'INACTIVE', message: 'Token inactivo' } } as const;
        }
        // else: continue; this disabled token is reserved and allowed to reveal
      }
      if (!token.prize?.active) return { status: 410, body: { code: 'INACTIVE', message: 'Token inactivo' } } as const;
      if (Date.now() > token.expiresAt.getTime()) return { status: 410, body: { code: 'EXPIRED', message: 'Token expirado' } } as const;
      if (token.revealedAt) return { status: 409, body: { code: 'ALREADY_REVEALED', message: 'Ya revelado' } } as const;

      const revealedAt = new Date();
      const assignedPrizeId = requestedPrizeId || token.prizeId;

      // Set revealedAt + assignedPrizeId; clear delivered/redeemed mirror fields for canonical revealed state
      await tx.token.update({ where: { id: tokenId }, data: { revealedAt, assignedPrizeId, deliveredAt: null, redeemedAt: null, deliveredByUserId: null, deliveryNote: null } });

      // Resolve action for retry/lose and optionally pre-select a next token (same batch)
      let action: 'RETRY' | 'LOSE' | undefined;
      let nextTokenId: string | null = null;
      const prizeKey = token.prize?.key || null;
      if (prizeKey === 'retry') {
        action = 'RETRY';
        console.log(`🎯 [REVEAL] Procesando retry token: ${tokenId}`);

        // Prefer pairedNextTokenId when present (printed pairing)
        if (token.pairedNextTokenId) {
          console.log(`🔗 [REVEAL] Verificando token pareado: ${token.pairedNextTokenId}`);
          const candidate = await tx.token.findUnique({ where: { id: token.pairedNextTokenId }, select: { id: true, redeemedAt: true, revealedAt: true, disabled: true, expiresAt: true, prize: { select: { key: true } } } });
          if (candidate && !candidate.redeemedAt && !candidate.revealedAt && candidate.expiresAt > new Date() && candidate.prize?.key !== 'retry' && candidate.prize?.key !== 'lose') {
            console.log(`✅ [REVEAL] Token funcional válido encontrado: ${candidate.id}, habilitando...`);
            // HABILITAR el token funcional (antes estaba disabled: true)
            await tx.token.update({ where: { id: candidate.id, revealedAt: null }, data: { disabled: false } });
            // Ensure retry has the paired id persisted (idempotent)
            if (!token.pairedNextTokenId) {
              await tx.token.update({ where: { id: token.id }, data: { pairedNextTokenId: candidate.id } });
            }
            nextTokenId = candidate.id;
            console.log(`🚀 [REVEAL] Token funcional habilitado exitosamente: ${candidate.id}`);
          } else {
            console.warn(`⚠️ [REVEAL] Token pareado no válido:`, {
              exists: !!candidate,
              redeemed: candidate?.redeemedAt,
              revealed: candidate?.revealedAt,
              expired: candidate ? candidate.expiresAt <= new Date() : null,
              prizeKey: candidate?.prize?.key
            });
          }
        }

        // Fallback dynamic selection if no valid pairing
        if (!nextTokenId) {
          console.log(`🔄 [REVEAL] Buscando token alternativo en el mismo batch...`);
          const next = await tx.token.findFirst({
            where: {
              batchId: token.batchId,
              id: { not: token.id },
              redeemedAt: null,
              revealedAt: null,
              disabled: false,
              expiresAt: { gt: new Date() },
              prize: { is: { key: { notIn: ['retry', 'lose'] } } },
            },
            orderBy: { id: 'asc' },
            select: { id: true },
          });
          if (next?.id) {
            console.log(`✅ [REVEAL] Token alternativo encontrado: ${next.id}, habilitando...`);
            // HABILITAR el token alternativo (antes estaba disabled: true)
            await tx.token.update({ where: { id: next.id, revealedAt: null }, data: { disabled: false } });
            // Persist fallback pairing on the retry to authorize reveal of disabled next
            await tx.token.update({ where: { id: token.id }, data: { pairedNextTokenId: next.id } });
            nextTokenId = next.id;
            console.log(`🚀 [REVEAL] Token alternativo habilitado exitosamente: ${next.id}`);
          } else {
            console.warn(`❌ [REVEAL] No se encontró token alternativo válido`);
            nextTokenId = null;
          }
        }
      } else if (prizeKey === 'lose') {
        action = 'LOSE';
      }

      const updated = await tx.token.findUnique({ where: { id: tokenId }, select: { id: true, prizeId: true, assignedPrizeId: true, revealedAt: true } });
      if (!updated) return { status: 500, body: { code: 'REVEAL_FAILED', message: 'Fallo al revelar' } } as const;

      const responseBody: any = {
        phase: 'REVEALED',
        tokenId: updated.id,
        prizeId: updated.assignedPrizeId || updated.prizeId,
        timestamps: { revealedAt: updated.revealedAt },
      };
      if (action) responseBody.action = action;
      if (action === 'RETRY') responseBody.nextTokenId = nextTokenId;

      return {
        status: 200,
        body: responseBody,
        log: { type: 'TOKEN_REVEALED', message: 'Token revealed (public flow)', metadata: { tokenId: updated.id, assignedPrizeId: updated.assignedPrizeId, action, nextTokenId, pairing: !!token.pairedNextTokenId } }
      } as const;
    });

    if (result.status === 200 && (result as any).log) {
      const l = (result as any).log;
      logEvent(l.type, l.message, l.metadata).catch(() => {});
    }

    if ('code' in result.body || 'error' in result.body) {
      const code = (result.body as any).code || (result.body as any).error;
      return apiError(code, (result.body as any).message || code, undefined, result.status);
    }
    return apiOk(result.body, result.status);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[TOKEN_REVEAL_ERROR]', e);
    return apiError('REVEAL_FAILED', 'Fallo al revelar', undefined, 500);
  }
}
