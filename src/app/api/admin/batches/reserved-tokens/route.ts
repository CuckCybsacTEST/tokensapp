import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) return NextResponse.json({ ok: false, message: 'ADMIN required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { batchId } = body;

    if (!batchId) {
      return NextResponse.json({ ok: false, message: 'batchId required' }, { status: 400 });
    }

    // Obtener tokens reservados (misma lógica que el endpoint PDF)
    const reservedRows = await (prisma as any).$queryRaw<Array<{ id: string }>>`
      SELECT tFunc.id as id
      FROM "Token" tRetry
      JOIN "Prize" pRetry ON pRetry.id = tRetry."prizeId"
      JOIN "Token" tFunc ON tFunc.id = tRetry."pairedNextTokenId"
      WHERE pRetry.key = 'retry' AND tFunc."batchId" = ${batchId}
    `;

    const reservedIds = Array.from(new Set((reservedRows || []).map((r: { id: string }) => r.id)));

    return NextResponse.json({
      ok: true,
      reservedIds
    });

  } catch (error) {
    console.error('Error fetching reserved tokens:', error);
    return NextResponse.json({ ok: false, message: 'Internal server error' }, { status: 500 });
  }
}