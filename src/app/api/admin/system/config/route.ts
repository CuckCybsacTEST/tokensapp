import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const auth = requireRole(session, ['ADMIN']);
  if (!auth.ok) return apiError(auth.error || 'UNAUTHORIZED', 'UNAUTHORIZED', undefined, auth.error === 'UNAUTHORIZED' ? 401 : 403);

  try {
    let config = await prisma.systemConfig.findFirst();
    if (!config) {
      // Crear configuración por defecto si no existe
      config = await prisma.systemConfig.create({
        data: {}
      });
    }
    return apiOk({
      config: {
        id: config.id,
        tokensEnabled: config.tokensEnabled,
        wednesdaySpecialBottle: config.wednesdaySpecialBottle || null,
        updatedAt: config.updatedAt.toISOString(),
      }
    });
  } catch (e) {
    return apiError('SYSTEM_CONFIG_FETCH_ERROR', 'Failed to load system config');
  }
}

export async function PATCH(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const auth = requireRole(session, ['ADMIN']);
  if (!auth.ok) return apiError(auth.error || 'UNAUTHORIZED', 'UNAUTHORIZED', undefined, auth.error === 'UNAUTHORIZED' ? 401 : 403);

  try {
    const body = await req.json().catch(()=>({}));
    const { tokensEnabled, wednesdaySpecialBottle } = body;

    const data: any = {};
    if (tokensEnabled != null) data.tokensEnabled = !!tokensEnabled;
    if (wednesdaySpecialBottle != null) {
      data.wednesdaySpecialBottle = typeof wednesdaySpecialBottle === 'string' && wednesdaySpecialBottle.trim()
        ? wednesdaySpecialBottle.trim()
        : null;
    }

    if (Object.keys(data).length === 0) return apiError('NO_FIELDS', 'Sin cambios', undefined, 400);

    let config = await prisma.systemConfig.findFirst();
    if (!config) {
      config = await prisma.systemConfig.create({ data });
    } else {
      config = await prisma.systemConfig.update({
        where: { id: config.id },
        data
      });
    }

    return apiOk({
      config: {
        id: config.id,
        tokensEnabled: config.tokensEnabled,
        wednesdaySpecialBottle: config.wednesdaySpecialBottle || null,
        updatedAt: config.updatedAt.toISOString(),
      }
    });
  } catch (e) {
    return apiError('SYSTEM_CONFIG_UPDATE_ERROR', 'Failed to update system config');
  }
}