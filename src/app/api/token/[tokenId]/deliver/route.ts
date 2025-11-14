import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTwoPhaseRedemptionEnabled, isClientDeliverAllowed } from "@/lib/featureFlags";
import { logEvent } from "@/lib/log";
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from "@/lib/auth";
import { apiError, apiOk } from '@/lib/apiError';

// POST /api/token/[tokenId]/deliver
// Body: (none required for now)
// Response (success): { phase: 'DELIVERED', tokenId, prizeId, timings: { revealToDeliverMs }, timestamps: { revealedAt, deliveredAt } }
// Error codes: TOKEN_NOT_FOUND, NOT_REVEALED, ALREADY_DELIVERED, TWO_PHASE_DISABLED

export async function POST(_req: NextRequest, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  if (!tokenId) {
    return apiError('TOKEN_ID_REQUIRED', 'tokenId requerido', undefined, 400);
  }

  const twoPhase = isTwoPhaseRedemptionEnabled();
  if (!twoPhase) {
    return apiError('TWO_PHASE_DISABLED', 'Flujo two-phase desactivado', undefined, 409);
  }

  // Autenticación flexible: si ALLOW_CLIENT_DELIVER=1, permitimos sin cookie
  // Caso normal: requerimos STAFF o ADMIN
  const allowClient = isClientDeliverAllowed();
  let session: any = null;
  if (!allowClient) {
    const rawCookie = getSessionCookieFromRequest(_req as any);
    session = await verifySessionCookie(rawCookie);
    const auth = requireRole(session, ['STAFF', 'ADMIN']);
    if (!auth.ok) {
      const code = auth.error || 'UNAUTHORIZED';
      return apiError(code, code, undefined, code === 'UNAUTHORIZED' ? 401 : 403);
    }
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
      // 1. Leer estado actual incluyendo información del batch
      const token = await tx.token.findUnique({
        where: { id: tokenId },
        select: {
          id: true,
          prizeId: true,
          revealedAt: true,
          deliveredAt: true,
          assignedPrizeId: true,
          batch: {
            select: {
              staticTargetUrl: true
            }
          }
        }
      });
  if (!token) return { status: 404, body: { code: 'TOKEN_NOT_FOUND', message: 'Token no encontrado' } } as const;
  if (!token.revealedAt) return { status: 409, body: { code: 'NOT_REVEALED', message: 'Token no revelado' } } as const;
  if (token.deliveredAt) return { status: 409, body: { code: 'ALREADY_DELIVERED', message: 'Ya entregado' } } as const;

      // 2. Determinar si es un lote estático
      const isStaticBatch = !!(token.batch?.staticTargetUrl && token.batch.staticTargetUrl.trim() !== '');

      // 3. Intento de actualización atómica condicionada deliveredAt IS NULL para evitar race
      const deliveredAt = new Date();
      const revealToDeliverMs = deliveredAt.getTime() - token.revealedAt.getTime();
  const deliveredByUserId = allowClient ? 'client_device' : (session?.role === 'STAFF' ? 'staff_user' : 'admin_user');

      // Para cualquier token entregado: marcar como canjeado automáticamente
      const updateData = {
        deliveredAt,
        redeemedAt: deliveredAt, // Auto-canje para todos los tokens entregados
        deliveredByUserId,
        deliveryNote,
        assignedPrizeId: token.assignedPrizeId ?? token.prizeId,
      };

      const updateRes = await tx.token.updateMany({
        where: { id: tokenId, deliveredAt: null },
        data: updateData
      });

      if (updateRes.count !== 1) {
        // Otro proceso ganó la carrera y entregó antes.
        return { status: 409, body: { code: 'ALREADY_DELIVERED', message: 'Ya entregado' } } as const;
      }

      // 3. Releer para respuesta
      const updated = await tx.token.findUnique({ where: { id: tokenId }, select: { id: true, prizeId: true, assignedPrizeId: true, revealedAt: true, deliveredAt: true, deliveryNote: true } });
  if (!updated) return { status: 500, body: { code: 'DELIVER_STATE_LOST', message: 'Estado perdido' } } as const;

      return { status: 200, body: {
        phase: 'DELIVERED',
        tokenId: updated.id,
        prizeId: updated.assignedPrizeId || updated.prizeId,
        timings: { revealToDeliverMs },
        timestamps: { revealedAt: updated.revealedAt, deliveredAt: updated.deliveredAt },
        deliveryNote: updated.deliveryNote || deliveryNote || null,
        isStaticBatch,
        autoRedeemed: isStaticBatch,
      }, log: { type: 'TOKEN_DELIVERED', message: isStaticBatch ? 'Token estático entregado y auto-canjeado' : 'Token delivered (two-phase)', metadata: { tokenId: updated.id, prizeId: updated.prizeId, assignedPrizeId: updated.assignedPrizeId, revealToDeliverMs, deliveryNote, isStaticBatch, autoRedeemed: isStaticBatch } } } as const;
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
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[TOKEN_DELIVER_ERROR]', e);
    return apiError('DELIVER_FAILED', 'Entrega fallida', undefined, 500);
  }
}
