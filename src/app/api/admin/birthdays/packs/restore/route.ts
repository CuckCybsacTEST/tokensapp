import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

// Definición base reutilizada (idéntica a seed.ts)
const DEFAULT_PACKS: { name: string; qrCount: number; bottle: string; featured: boolean; perks: string[]; priceSoles: number }[] = [
  {
    name: 'Chispa',
    qrCount: 5,
    bottle: 'Russkaya',
    featured: false,
    perks: ['Botella de cortesía: Russkaya', 'Fotos', 'Collares neón', '5 QRs cumpleañero'],
    priceSoles: 50,
  },
  {
    name: 'Fuego',
    qrCount: 10,
    bottle: 'Old Times',
    featured: true,
    perks: ['Botella de cortesía: Old Times', 'Foto grupal impresa', '10 QRs cumpleañero', 'Collares neón'],
    priceSoles: 80,
  },
  {
    name: 'Estrella',
    qrCount: 20,
    bottle: 'Red Label',
    featured: true,
    perks: ['Botella de cortesía: Red Label', '20 QRs cumpleañero', '3 fotos impresas', 'Stickers VIP adhesivos', 'Collares neón'],
    priceSoles: 110,
  },
  {
    name: 'Galaxia',
    qrCount: 30,
    bottle: 'Black Label',
    featured: true,
    perks: ['Botella de cortesía: Black Label', '30 QRs cumpleañero', '5 fotos impresas', 'Acceso VIP', 'Collares neón'],
    priceSoles: 120,
  },
  // Placeholder fijo para personalizaciones internas (no se muestra públicamente)
  {
    name: 'Personalizado',
    qrCount: 10, // Valor inicial editable al crear la reserva
    bottle: 'A definir',
    featured: false,
    perks: ['Pack personalizado coordinado con el staff'],
    priceSoles: 0,
  },
];

export async function POST(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN', 'STAFF']);
  if (!authz.ok) return apiError(authz.error || 'UNAUTHORIZED', 'UNAUTHORIZED', undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);

  try {
    for (const p of DEFAULT_PACKS) {
      const isCustom = p.name.toLowerCase() === 'personalizado';
      await prisma.birthdayPack.upsert({
        where: { name: p.name },
        update: { qrCount: p.qrCount, bottle: p.bottle, featured: p.featured, perks: JSON.stringify(p.perks), active: true, priceSoles: p.priceSoles, isCustom },
        create: { name: p.name, qrCount: p.qrCount, bottle: p.bottle, featured: p.featured, perks: JSON.stringify(p.perks), active: true, priceSoles: p.priceSoles, isCustom },
      });
    }
    const packs = await prisma.birthdayPack.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  return apiOk({ restored: true, count: packs.length, packs: packs.map((p: any) => ({ id: p.id, name: p.name, qrCount: p.qrCount, bottle: p.bottle, featured: p.featured, priceSoles: (p as any).priceSoles ?? 0, isCustom: (p as any).isCustom === true })) });
  } catch (e) {
    return apiError('RESTORE_PACKS_FAILED', 'No se pudieron recrear los packs');
  }
}
