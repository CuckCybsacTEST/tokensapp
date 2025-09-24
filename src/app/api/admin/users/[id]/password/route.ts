import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const id = String(params?.id || '').trim();
    if (!id) return NextResponse.json({ ok: false, code: 'BAD_REQUEST', message: 'Missing user id' }, { status: 400 });

    const body = await req.json().catch(() => null) as { password?: string } | null;
    const password = String(body?.password || '');
    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, code: 'INVALID_PASSWORD', message: 'Password must be at least 8 chars' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('admin change password error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
