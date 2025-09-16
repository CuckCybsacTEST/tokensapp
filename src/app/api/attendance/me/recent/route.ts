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
      `SELECT s.id, s.scannedAt, s.type, s.deviceId, p.code, p.name
       FROM User u
       JOIN Person p ON p.id = u.personId
       LEFT JOIN Scan s ON s.personId = p.id
       WHERE u.id='${esc(u.userId)}'
       ORDER BY s.scannedAt DESC
       LIMIT 1`
    );
    const r = rows && rows[0];
    return NextResponse.json({ ok: true, recent: r || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
