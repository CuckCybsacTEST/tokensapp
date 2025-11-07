import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  try {
    const raw = getUserCookie(req);
    const u = await verifyUserCookie(raw);
    if (!u) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => null) as { currentPassword?: string; newPassword?: string } | null;
    if (!body || !body.currentPassword || !body.newPassword) {
      return NextResponse.json({ ok: false, code: 'BAD_REQUEST', message: 'Current password and new password are required' }, { status: 400 });
    }

    const { currentPassword, newPassword } = body;

    if (newPassword.length < 8) {
      return NextResponse.json({ ok: false, code: 'INVALID_PASSWORD', message: 'New password must be at least 8 characters' }, { status: 400 });
    }

    // Get current user with password hash
    const user = await prisma.user.findUnique({
      where: { id: u.userId },
      select: { id: true, passwordHash: true }
    });

    if (!user) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ ok: false, code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const newPasswordHash = bcrypt.hashSync(newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id: u.userId },
      data: { passwordHash: newPasswordHash }
    });

    return NextResponse.json({ ok: true, message: 'Password changed successfully' });
  } catch (e: any) {
    console.error('user change password error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
