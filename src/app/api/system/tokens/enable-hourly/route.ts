export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

// Habilita tokens con ventana horaria cuyo validFrom ya pasó y siguen disabled=true
// GET o POST sin body: /api/system/tokens/enable-hourly
export async function POST(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const ok = requireRole(session, ['ADMIN','STAFF']);
  if (!ok.ok) {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }
  const now = new Date();
  // Uso de SQL crudo porque el cliente puede no estar regenerado todavía para incluir validFrom
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE "Token" SET "disabled" = false WHERE "disabled" = true AND "validFrom" IS NOT NULL AND "validFrom" <= $1 AND "expiresAt" > $1`,
    now as any
  );
  return NextResponse.json({ ok: true, updated });
}

export async function GET(req: Request) {
  return POST(req);
}
