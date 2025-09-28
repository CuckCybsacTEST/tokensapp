export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
  if (!session) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);
    const roleCheck = requireRole(session, ['ADMIN']);
  if (!roleCheck.ok) return apiError('FORBIDDEN','FORBIDDEN',undefined,403);

    // Obtener todos los lotes con conteo de tokens
    const batches = await prisma.batch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tokens: { select: { id: true } },
      },
      take: 50,
    });

    return apiOk(batches);
  } catch (err: any) {
    console.error('Error al obtener lotes:', err);
    return apiError('INTERNAL_ERROR','Error interno',{ message: err?.message || String(err) },500);
  }
}
