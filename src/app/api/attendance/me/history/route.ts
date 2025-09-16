import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from '@/lib/auth-user';

export async function GET(req: Request) {
  try {
    const raw = getUserCookie(req);
    const u = await verifyUserCookie(raw);
    if (!u) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const esc = (s: string) => s.replace(/'/g, "''");
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT s.id, s.scannedAt, s.type, s.deviceId
       FROM Scan s
       WHERE s.personId = (SELECT personId FROM User WHERE id='${esc(u.userId)}')
       ORDER BY s.scannedAt DESC
       LIMIT 50`
    );
    return NextResponse.json({ ok: true, items: rows || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
