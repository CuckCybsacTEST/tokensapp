import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from '@/lib/auth-user';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const raw = getUserCookie(req);
    const u = await verifyUserCookie(raw);
    if (!u) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    const found = await prisma.user.findUnique({
      where: { id: u.userId },
      select: {
        id: true,
        username: true,
        role: true,
        person: { select: { code: true, name: true, area: true, dni: true } },
      },
    });
    if (!found) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
    const user = {
      id: found.id,
      username: found.username,
      role: found.role,
      personCode: found.person?.code ?? null,
      personName: found.person?.name ?? null,
      area: found.person?.area ?? null,
      dni: found.person?.dni ?? null,
    };
    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
