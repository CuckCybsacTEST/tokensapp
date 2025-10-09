import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { logEvent } from '@/lib/log';

// POST /api/admin/tokens/backfill-retry-reservations
// Admin-only. Disables ALL paired functional tokens for existing retry tokens (bi-token reservation) incluso si el retry aún NO fue revelado.
// Efecto: tokens referenciados por pairedNextTokenId quedan disabled=true si siguen activos (no revelados, no canjeados, no expirados y no son retry/lose).
export async function POST(req: NextRequest) {
  // Auth ADMIN
  const raw = getSessionCookieFromRequest(req as any);
  const session = await verifySessionCookie(raw);
  const auth = requireRole(session, ['ADMIN']);
  if (!auth.ok) {
    const code = auth.error || 'UNAUTHORIZED';
    return apiError(code, code, undefined, code === 'UNAUTHORIZED' ? 401 : 403);
  }

  try {
    const now = new Date();
    // Load all retry tokens with pairedNextTokenId
    // Raw query para obtener TODOS los retries pareados (revelados o no)
    const retries: { id: string; pairedNextTokenId: string | null }[] = await (prisma as any).$queryRaw`
      SELECT t.id, t."pairedNextTokenId"
      FROM "Token" t
      JOIN "Prize" p ON p.id = t."prizeId"
      WHERE p.key = 'retry' AND t."pairedNextTokenId" IS NOT NULL
    `;
    if (!retries.length) return apiOk({ updated: 0, totalPairs: 0 });

    // Load candidate next tokens in one query
  const nextIds = Array.from(new Set(retries.map(r => r.pairedNextTokenId as string).filter(Boolean)));
    if (nextIds.length === 0) return apiOk({ updated: 0, totalPairs: 0 });

    const nextTokens = await prisma.token.findMany({
      where: { id: { in: nextIds } },
      select: { id: true, redeemedAt: true, revealedAt: true, disabled: true, expiresAt: true, prize: { select: { key: true } } },
    });

    const toDisable: string[] = [];
    for (const t of nextTokens) {
      const isFunctional = t.prize?.key !== 'retry' && t.prize?.key !== 'lose';
      if (!isFunctional) continue;
      if (t.disabled) continue; // already reserved
  if (t.redeemedAt || t.revealedAt) continue; // already used
  if (t.expiresAt && t.expiresAt <= now) continue; // expired
      toDisable.push(t.id);
    }

    let updated = 0;
    // Chunked updates to avoid parameter limits
    const CHUNK = 1000;
    for (let i = 0; i < toDisable.length; i += CHUNK) {
      const slice = toDisable.slice(i, i + CHUNK);
      const res = await prisma.token.updateMany({ where: { id: { in: slice }, revealedAt: null }, data: { disabled: true } });
      updated += res.count;
    }

  await logEvent('BACKFILL_RETRY_RESERVATIONS', 'Paired functional tokens disabled (global bi-token reservation)', { updated, totalPairs: retries.length });
  return apiOk({ updated, totalPairs: retries.length, requested: nextIds.length });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[BACKFILL_RETRY_RESERVATIONS_ERROR]', e);
    return apiError('INTERNAL_ERROR','Error interno', { message: e?.message || String(e) }, 500);
  }
}
