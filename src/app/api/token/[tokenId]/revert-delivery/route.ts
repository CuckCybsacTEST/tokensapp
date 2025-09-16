import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTwoPhaseRedemptionEnabled } from "@/lib/featureFlags";
import { logEvent } from "@/lib/log";
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from "@/lib/auth";

// POST /api/token/[tokenId]/revert-delivery
// Preconditions: twoPhaseRedemption enabled, token delivered, user is ADMIN (simplified: valid admin session cookie)
// Effect: clears deliveredAt, deliveredByUserId, (and redeemedAt mirror) leaving revealedAt + assignedPrizeId intact.
// Response: { phase: 'REVEALED', tokenId, prizeId, timestamps: { revealedAt } }

export async function POST(req: NextRequest, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  if (!tokenId) return new Response(JSON.stringify({ error: 'TOKEN_ID_REQUIRED' }), { status: 400 });

  const twoPhase = isTwoPhaseRedemptionEnabled();
  if (!twoPhase) return new Response(JSON.stringify({ error: 'TWO_PHASE_DISABLED' }), { status: 409 });

  // Simple admin check: presence of valid session cookie
  const rawCookie = getSessionCookieFromRequest(req as any);
  const session = await verifySessionCookie(rawCookie);
  const auth = requireRole(session, ['ADMIN']);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.error === 'UNAUTHORIZED' ? 401 : 403 });

  try {
    const result = await (prisma as any).$transaction(async (tx: any) => {
      const token = await tx.token.findUnique({ where: { id: tokenId }, select: { id: true, prizeId: true, revealedAt: true, deliveredAt: true, assignedPrizeId: true, redeemedAt: true } });
      if (!token) return { status: 404, body: { error: 'TOKEN_NOT_FOUND' } } as const;
      if (!token.revealedAt) return { status: 409, body: { error: 'NOT_REVEALED' } } as const;
      if (!token.deliveredAt) return { status: 409, body: { error: 'NOT_DELIVERED' } } as const;

      const updated = await tx.token.update({
        where: { id: tokenId },
        data: {
          deliveredAt: null,
          deliveredByUserId: null,
          redeemedAt: null, // mirror cleared (only in two-phase context)
        },
        select: { id: true, prizeId: true, assignedPrizeId: true, revealedAt: true }
      });

      return { status: 200, body: {
        phase: 'REVEALED',
        tokenId: updated.id,
        prizeId: updated.assignedPrizeId || updated.prizeId,
        timestamps: { revealedAt: updated.revealedAt },
      }, log: { type: 'TOKEN_DELIVERY_REVERTED', message: 'Token delivery reverted', metadata: { tokenId: updated.id, prizeId: updated.prizeId, assignedPrizeId: updated.assignedPrizeId } } } as const;
    });

    if (result.status === 200 && (result as any).log) {
      const l = (result as any).log;
      logEvent(l.type, l.message, l.metadata).catch(() => {});
    }

    return new Response(JSON.stringify(result.body), { status: result.status });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[TOKEN_REVERT_DELIVERY_ERROR]', e);
    return new Response(JSON.stringify({ error: 'REVERT_FAILED' }), { status: 500 });
  }
}
