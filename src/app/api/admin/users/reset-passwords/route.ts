export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN']); // Only ADMIN can reset all passwords
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const newPassword = body.password || '123456789';

    // Validate password
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ ok: false, code: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Hash the new password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    // Update all users' passwords and mark them to force password change
    const result = await prisma.user.updateMany({
      data: {
        passwordHash: passwordHash,
        forcePasswordChange: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Contraseñas de ${result.count} usuarios actualizadas exitosamente`,
      updatedCount: result.count
    });

  } catch (e: any) {
    console.error('admin reset passwords error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
