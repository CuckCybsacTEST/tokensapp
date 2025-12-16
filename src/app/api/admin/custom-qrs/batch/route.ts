export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function GET(req: Request) {
  console.log('[api/custom-qrs/batch] GET request received');
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const batches = await (prisma as any).customQrBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { qrs: true }
        }
      }
    });

    console.log(`[api/custom-qrs/batch] Returning ${batches.length} batches`);
    return NextResponse.json(batches);

  } catch (error: any) {
    console.error('[API] Error obteniendo lotes:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}

export async function POST(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const { name, description, theme } = await req.json();

    if (!name || name.trim().length === 0) {
      return apiError('BAD_REQUEST', 'El nombre del lote es requerido', undefined, 400);
    }

    const batch = await (prisma as any).customQrBatch.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        theme: theme || 'default'
      }
    });

    return NextResponse.json(batch, { status: 201 });

  } catch (error: any) {
    console.error('[API] Error creando lote:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}