import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function GET(_: Request, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  if (!tokenId || tokenId.length < 10) return apiError('BAD_TOKEN', 'Token inválido', undefined, 400);
  // Raw query to avoid potential stale generated types
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT t.id, t.disabled, t."expiresAt", t."validFrom", t."batchId", b."staticTargetUrl"
    FROM "Token" t
    JOIN "Batch" b ON b.id = t."batchId"
    WHERE t.id = $1
    LIMIT 1
  `, tokenId);
  if (!rows.length) return apiError('NOT_FOUND', 'No existe', undefined, 404);
  const rec = rows[0];
  if (!rec.staticTargetUrl) return apiError('NOT_FOUND', 'No existe', undefined, 404);
  if (rec.disabled) return apiError('DISABLED', 'Token deshabilitado', undefined, 403);
  if (rec.validFrom && new Date(rec.validFrom).getTime() > Date.now()) return apiError('TOO_EARLY', 'Aún no válido', undefined, 403);
  if (new Date(rec.expiresAt).getTime() < Date.now()) return apiError('EXPIRED', 'Expirado', undefined, 410);
  return new Response(null, { status: 307, headers: { Location: rec.staticTargetUrl } });
}
