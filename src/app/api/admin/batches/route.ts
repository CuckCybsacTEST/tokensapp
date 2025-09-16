import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    // Obtener todos los lotes con conteo de tokens
    const batches = await prisma.batch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tokens: { select: { id: true } },
      },
      take: 50,
    });

    return NextResponse.json(batches);
  } catch (err: any) {
    console.error('Error al obtener lotes:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', detail: err?.message || String(err) }, { status: 500 });
  }
}
