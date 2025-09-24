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
      `SELECT u.id as id, u.username as username, u.role as role,
              p.code as personCode, p.name as personName, p.area as area, p.dni as dni
         FROM User u JOIN Person p ON p.id = u.personId
        WHERE u.id='${esc(u.userId)}' LIMIT 1`
    );
    const user = rows && rows[0];
    if (!user) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
