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
        person: {
          select: {
            scans: {
              select: { id: true, scannedAt: true, type: true, deviceId: true, businessDay: true },
              orderBy: { scannedAt: 'desc' },
              take: 50,
            },
          },
        },
      },
    });
    const items = found?.person?.scans ?? [];
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
