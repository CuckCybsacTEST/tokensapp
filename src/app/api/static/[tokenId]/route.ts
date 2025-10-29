import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';

export async function GET(_: Request, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  if (!tokenId || tokenId.length < 10) return apiError('BAD_TOKEN', 'Token inválido', undefined, 400);

  // Raw query to avoid potential stale generated types
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      t.id, t.disabled, t."expiresAt", t."validFrom", t."batchId", t."deliveredAt",
      b."staticTargetUrl", b.description, b."createdAt",
      p.key, p.label, p.color
    FROM "Token" t
    JOIN "Batch" b ON b.id = t."batchId"
    JOIN "Prize" p ON p.id = t."prizeId"
    WHERE t.id = $1
    LIMIT 1
  `, tokenId);

  if (!rows.length) return apiError('NOT_FOUND', 'Token no encontrado', undefined, 404);

  const rec = rows[0];
  // Note: staticTargetUrl is now optional for static batches
  if (rec.disabled) return apiError('DISABLED', 'Token deshabilitado', undefined, 403);
  if (rec.validFrom && new Date(rec.validFrom).getTime() > Date.now()) return apiError('TOO_EARLY', 'Aún no válido', undefined, 403);
  if (new Date(rec.expiresAt).getTime() < Date.now()) return apiError('EXPIRED', 'Expirado', undefined, 410);

  const tokenData = {
    id: rec.id,
    prize: {
      key: rec.key,
      label: rec.label,
      color: rec.color
    },
    batch: {
      id: rec.batchId,
      description: rec.description,
      staticTargetUrl: rec.staticTargetUrl,
      createdAt: rec.createdAt
    },
    expiresAt: rec.expiresAt,
    validFrom: rec.validFrom,
    disabled: rec.disabled,
    deliveredAt: rec.deliveredAt
  };

  return apiOk({ token: tokenData });
}