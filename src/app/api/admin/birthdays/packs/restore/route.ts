import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

// Definición base reutilizada (idéntica a seed.ts)
const DEFAULT_PACKS: { name: string; qrCount: number; bottle: string; featured: boolean; perks: string[] }[] = [
  {
    name: 'Chispa',
    qrCount: 5,
    bottle: 'Russkaya',
    featured: false,
    perks: ['Botella de cortesía: Russkaya', 'Fotos', 'Collares neón', '5 QRs cumpleañero'],
  },
  {
    name: 'Fuego',
    qrCount: 10,
    bottle: 'Old Times',
    featured: true,
    perks: ['Botella de cortesía: Old Times', 'Foto grupal impresa', '10 QRs cumpleañero', 'Collares neón'],
  },
  {
    name: 'Estrella',
    qrCount: 20,
    bottle: 'Red Label',
    featured: true,
    perks: ['Botella de cortesía: Red Label', '20 QRs cumpleañero', '3 fotos impresas', 'Stickers VIP adhesivos', 'Collares neón'],
  },
];

export async function POST(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN', 'STAFF']);
  if (!authz.ok) return apiError(authz.error || 'UNAUTHORIZED', 'UNAUTHORIZED', undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);

  try {
    for (const p of DEFAULT_PACKS) {
      await prisma.birthdayPack.upsert({
        where: { name: p.name },
        update: { qrCount: p.qrCount, bottle: p.bottle, featured: p.featured, perks: JSON.stringify(p.perks), active: true },
        create: { name: p.name, qrCount: p.qrCount, bottle: p.bottle, featured: p.featured, perks: JSON.stringify(p.perks), active: true },
      });
    }
    const packs = await prisma.birthdayPack.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    return apiOk({ restored: true, count: packs.length, packs: packs.map(p => ({ id: p.id, name: p.name, qrCount: p.qrCount, bottle: p.bottle, featured: p.featured })) });
  } catch (e) {
    return apiError('RESTORE_PACKS_FAILED', 'No se pudieron recrear los packs');
  }
}
