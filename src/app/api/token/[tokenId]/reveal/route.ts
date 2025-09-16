import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTwoPhaseRedemptionEnabled } from "@/lib/featureFlags";
import { logEvent } from "@/lib/log";

// POST /api/token/[tokenId]/reveal
// Body: { prizeId?: string }
// Errors: TOKEN_NOT_FOUND, TWO_PHASE_DISABLED, ALREADY_REVEALED, INACTIVE, EXPIRED
export async function POST(_req: NextRequest, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  if (!tokenId) return new Response(JSON.stringify({ error: 'TOKEN_ID_REQUIRED' }), { status: 400 });

  const twoPhase = isTwoPhaseRedemptionEnabled();
  if (!twoPhase) return new Response(JSON.stringify({ error: 'TWO_PHASE_DISABLED' }), { status: 409 });

  try {
    const body = await _req.json().catch(() => ({}));
    const requestedPrizeId = body?.prizeId;

    const result = await prisma.$transaction(async (tx: any) => {
      const token = await tx.token.findUnique({ where: { id: tokenId }, include: { prize: true } });
      if (!token) return { status: 404, body: { error: 'TOKEN_NOT_FOUND' } } as const;
      if (token.disabled || !token.prize?.active) return { status: 410, body: { error: 'INACTIVE' } } as const;
      if (Date.now() > token.expiresAt.getTime()) return { status: 410, body: { error: 'EXPIRED' } } as const;
      if (token.revealedAt) return { status: 409, body: { error: 'ALREADY_REVEALED' } } as const;

      const revealedAt = new Date();
      const assignedPrizeId = requestedPrizeId || token.prizeId;

      // Set revealedAt + assignedPrizeId; clear delivered/redeemed mirror fields for canonical revealed state
      await tx.token.update({ where: { id: tokenId }, data: { revealedAt, assignedPrizeId, deliveredAt: null, redeemedAt: null, deliveredByUserId: null, deliveryNote: null } });

      const updated = await tx.token.findUnique({ where: { id: tokenId }, select: { id: true, prizeId: true, assignedPrizeId: true, revealedAt: true } });
      if (!updated) return { status: 500, body: { error: 'REVEAL_FAILED' } } as const;

      return { status: 200, body: { phase: 'REVEALED', tokenId: updated.id, prizeId: updated.assignedPrizeId || updated.prizeId, timestamps: { revealedAt: updated.revealedAt } }, log: { type: 'TOKEN_REVEALED', message: 'Token revealed (public flow)', metadata: { tokenId: updated.id, assignedPrizeId: updated.assignedPrizeId } } } as const;
    });

    if (result.status === 200 && (result as any).log) {
      const l = (result as any).log;
      logEvent(l.type, l.message, l.metadata).catch(() => {});
    }

    return new Response(JSON.stringify(result.body), { status: result.status });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[TOKEN_REVEAL_ERROR]', e);
    return new Response(JSON.stringify({ error: 'REVEAL_FAILED' }), { status: 500 });
  }
}
