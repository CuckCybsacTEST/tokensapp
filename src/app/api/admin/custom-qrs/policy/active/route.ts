export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const activePolicy = await (prisma as any).customQrPolicy.findFirst({
      where: { isActive: true },
      include: {
        // Si necesitas incluir el batch, descomenta:
        // batch: true
      }
    });

    if (!activePolicy) {
      return NextResponse.json({
        message: 'No hay política activa',
        policy: null
      });
    }

    return NextResponse.json({
      message: 'Política activa encontrada',
      policy: activePolicy
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo política activa:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}