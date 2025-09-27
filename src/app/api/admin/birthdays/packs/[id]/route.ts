import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const auth = requireRole(session, ['ADMIN', 'STAFF']);
  if (!auth.ok) return apiError(auth.error || 'UNAUTHORIZED', 'UNAUTHORIZED', undefined, auth.error === 'UNAUTHORIZED' ? 401 : 403);
  const id = params.id;
  try {
    const body = await req.json().catch(()=>({}));
    const { name, qrCount, bottle, perks, active, featured } = body;
    const data: any = {};
    if (name != null) {
      const trimmed = String(name).trim();
      if (!trimmed) return apiError('INVALID_NAME', 'Nombre inválido', undefined, 400);
      data.name = trimmed;
    }
    if (qrCount != null) {
      const n = Number(qrCount);
      if (!Number.isFinite(n) || n <= 0 || n > 1000) return apiError('INVALID_QR_COUNT', 'Cantidad inválida', undefined, 400);
      data.qrCount = n;
    }
    if (bottle != null) {
      data.bottle = String(bottle).trim();
    }
    if (perks != null) {
      if (!Array.isArray(perks)) return apiError('INVALID_PERKS', 'Perks debe ser array', undefined, 400);
      const cleaned = perks.map((p:any)=>String(p||'').trim()).filter(Boolean).slice(0, 30);
      data.perks = JSON.stringify(cleaned);
    }
    if (active != null) data.active = !!active;
    if (featured != null) data.featured = !!featured;

    if (Object.keys(data).length === 0) return apiError('NO_FIELDS', 'Sin cambios', undefined, 400);

    const updated = await prisma.birthdayPack.update({ where: { id }, data });
    return apiOk({ pack: { id: updated.id, name: updated.name, qrCount: updated.qrCount, bottle: updated.bottle, featured: updated.featured, active: updated.active, perks: JSON.parse(updated.perks || '[]') } });
  } catch (e: any) {
    if (String(e?.message||'').includes('Unique') && String(e?.message||'').includes('name')) {
      return apiError('NAME_TAKEN', 'Nombre de pack duplicado', undefined, 409);
    }
    return apiError('PACK_UPDATE_FAILED', 'No se pudo actualizar el pack');
  }
}
