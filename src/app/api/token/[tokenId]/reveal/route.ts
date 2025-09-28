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
  if (token.disabled || !token.prize?.active) return { status: 410, body: { code: 'INACTIVE', message: 'Token inactivo' } } as const;
  if (Date.now() > token.expiresAt.getTime()) return { status: 410, body: { code: 'EXPIRED', message: 'Token expirado' } } as const;
  if (token.revealedAt) return { status: 409, body: { code: 'ALREADY_REVEALED', message: 'Ya revelado' } } as const;

      const revealedAt = new Date();
      const assignedPrizeId = requestedPrizeId || token.prizeId;

      // Set revealedAt + assignedPrizeId; clear delivered/redeemed mirror fields for canonical revealed state
      await tx.token.update({ where: { id: tokenId }, data: { revealedAt, assignedPrizeId, deliveredAt: null, redeemedAt: null, deliveredByUserId: null, deliveryNote: null } });

      const updated = await tx.token.findUnique({ where: { id: tokenId }, select: { id: true, prizeId: true, assignedPrizeId: true, revealedAt: true } });
  if (!updated) return { status: 500, body: { code: 'REVEAL_FAILED', message: 'Fallo al revelar' } } as const;

      return { status: 200, body: { phase: 'REVEALED', tokenId: updated.id, prizeId: updated.assignedPrizeId || updated.prizeId, timestamps: { revealedAt: updated.revealedAt } }, log: { type: 'TOKEN_REVEALED', message: 'Token revealed (public flow)', metadata: { tokenId: updated.id, assignedPrizeId: updated.assignedPrizeId } } } as const;
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
