import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTwoPhaseRedemptionEnabled } from "@/lib/featureFlags";
import { logEvent } from "@/lib/log";
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from "@/lib/auth";

// POST /api/token/[tokenId]/deliver
// Body: (none required for now)
// Response (success): { phase: 'DELIVERED', tokenId, prizeId, timings: { revealToDeliverMs }, timestamps: { revealedAt, deliveredAt } }
// Error codes: TOKEN_NOT_FOUND, NOT_REVEALED, ALREADY_DELIVERED, TWO_PHASE_DISABLED

export async function POST(_req: NextRequest, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  if (!tokenId) {
    return new Response(JSON.stringify({ error: 'TOKEN_ID_REQUIRED' }), { status: 400 });
  }

  const twoPhase = isTwoPhaseRedemptionEnabled();
  if (!twoPhase) {
    // Feature desactivada: la entrega explícita no aplica en modo legacy
    return new Response(JSON.stringify({ error: 'TWO_PHASE_DISABLED' }), { status: 409 });
  }

  // Require STAFF (or ADMIN) role
  const rawCookie = getSessionCookieFromRequest(_req as any);
  const session = await verifySessionCookie(rawCookie);
  const auth = requireRole(session, ['STAFF', 'ADMIN']);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.error === 'UNAUTHORIZED' ? 401 : 403 });
  }

  try {
    let deliveryNote: string | null = null;
    try {
      const body = await _req.json();
      if (body && typeof body.deliveryNote === 'string') {
        deliveryNote = body.deliveryNote.trim();
        if (deliveryNote && deliveryNote.length > 600) deliveryNote = deliveryNote.slice(0,600);
      }
    } catch { /* no body */ }
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Leer estado actual
      const token = await tx.token.findUnique({ where: { id: tokenId }, select: { id: true, prizeId: true, revealedAt: true, deliveredAt: true, assignedPrizeId: true } });
      if (!token) return { status: 404, body: { error: 'TOKEN_NOT_FOUND' } } as const;
      if (!token.revealedAt) return { status: 409, body: { error: 'NOT_REVEALED' } } as const;
      if (token.deliveredAt) return { status: 409, body: { error: 'ALREADY_DELIVERED' } } as const;

      // 2. Intento de actualización atómica condicionada deliveredAt IS NULL para evitar race
      const deliveredAt = new Date();
      const revealToDeliverMs = deliveredAt.getTime() - token.revealedAt.getTime();
      const deliveredByUserId = session?.role === 'STAFF' ? 'staff_user' : 'admin_user';

      const updateRes = await tx.token.updateMany({
        where: { id: tokenId, deliveredAt: null },
        data: {
          deliveredAt,
          redeemedAt: deliveredAt, // mirror legacy
          deliveredByUserId,
          deliveryNote,
          assignedPrizeId: token.assignedPrizeId ?? token.prizeId,
        }
      });

      if (updateRes.count !== 1) {
        // Otro proceso ganó la carrera y entregó antes.
        return { status: 409, body: { error: 'ALREADY_DELIVERED' } } as const;
      }

      // 3. Releer para respuesta
      const updated = await tx.token.findUnique({ where: { id: tokenId }, select: { id: true, prizeId: true, assignedPrizeId: true, revealedAt: true, deliveredAt: true, deliveryNote: true } });
      if (!updated) return { status: 500, body: { error: 'DELIVER_STATE_LOST' } } as const; // muy improbable

      return { status: 200, body: {
        phase: 'DELIVERED',
        tokenId: updated.id,
        prizeId: updated.assignedPrizeId || updated.prizeId,
        timings: { revealToDeliverMs },
        timestamps: { revealedAt: updated.revealedAt, deliveredAt: updated.deliveredAt },
        deliveryNote: updated.deliveryNote || deliveryNote || null,
      }, log: { type: 'TOKEN_DELIVERED', message: 'Token delivered (two-phase)', metadata: { tokenId: updated.id, prizeId: updated.prizeId, assignedPrizeId: updated.assignedPrizeId, revealToDeliverMs, deliveryNote } } } as const;
    });

    if (result.status === 200 && (result as any).log) {
      const l = (result as any).log;
      logEvent(l.type, l.message, l.metadata).catch(() => {});
    }

    return new Response(JSON.stringify(result.body), { status: result.status });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[TOKEN_DELIVER_ERROR]', e);
    return new Response(JSON.stringify({ error: 'DELIVER_FAILED' }), { status: 500 });
  }
}
