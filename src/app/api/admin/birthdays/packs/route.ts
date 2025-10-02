import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const auth = requireRole(session, ['ADMIN', 'STAFF']);
  if (!auth.ok) return apiError(auth.error || 'UNAUTHORIZED', 'UNAUTHORIZED', undefined, auth.error === 'UNAUTHORIZED' ? 401 : 403);
  try {
    let packs = await prisma.birthdayPack.findMany({ orderBy: { name: 'asc' } });
    const hasCustom = packs.some((p: any) => p.isCustom === true || p.name.toLowerCase() === 'personalizado');
    if (!hasCustom) {
      // Auto-crear placeholder si no existe
      try {
        await prisma.birthdayPack.create({
          data: {
            name: 'Personalizado',
            qrCount: 10,
            bottle: 'A definir',
            perks: JSON.stringify(['Pack personalizado coordinado con el staff']),
            active: true,
            featured: false,
            priceSoles: 0,
            isCustom: true,
          }
        });
        packs = await prisma.birthdayPack.findMany({ orderBy: { name: 'asc' } });
      } catch (e) {
        // Ignorar si hay condición de carrera o unique conflict
      }
    }
    return apiOk({ packs: packs.map((p: any) => ({ id: p.id, name: p.name, qrCount: p.qrCount, bottle: p.bottle, featured: p.featured, active: p.active, perks: safeJson(p.perks), priceSoles: (p as any).priceSoles ?? 0, isCustom: (p as any).isCustom === true })) });
  } catch (e) {
    return apiError('PACKS_LIST_FAILED', 'No se pudieron listar');
  }
}

function safeJson(s: string | null) { try { const v = JSON.parse(s||'[]'); return Array.isArray(v)? v : []; } catch { return []; } }
