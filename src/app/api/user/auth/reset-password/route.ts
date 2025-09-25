import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logEvent } from '@/lib/log';
import { checkRateLimitCustom } from '@/lib/rateLimit';
import { getSessionCookieFromRequest, verifySessionCookie } from '@/lib/auth';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie } from '@/lib/auth-user';

export const dynamic = 'force-dynamic';

function normDni(s: unknown): string {
  return String(s || '').replace(/\D+/g, '');
}

export async function POST(req: Request) {
  try {
    // Debe ser público: no permitir si hay una sesión activa (admin o colaborador)
    const adminRaw = getSessionCookieFromRequest(req);
    const adminSession = await verifySessionCookie(adminRaw);
    const userRaw = getUserCookie(req);
    const userSession = await verifyUserSessionCookie(userRaw);
    if (adminSession || userSession) {
      return new Response(JSON.stringify({ error: 'MUST_LOGOUT' }), { status: 400 });
    }

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || '0.0.0.0';
    const rl = checkRateLimitCustom(`reset:${ip}`, 5, 10_000);
    if (!rl.ok) return new Response(JSON.stringify({ error: 'RATE_LIMIT' }), { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } });

    const body = await req.json().catch(() => ({} as any));
    const dni = normDni(body?.dni);
    const code = String(body?.code || '').trim();
    const password = String(body?.password || '');
    if (!dni || !code || password.length < 8) {
      return new Response(JSON.stringify({ error: 'INVALID_INPUT' }), { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { person: { dni } }, select: { id: true, personId: true } });
    if (!user) {
      await logEvent('USER_RESET_FAIL', 'OTP reset: usuario no encontrado por DNI', { dni });
      return new Response(JSON.stringify({ error: 'INVALID_DNI_OR_CODE' }), { status: 400 });
    }

    const now = new Date();
    // Raw select to avoid depending on generated model types
    const rows: any[] = await prisma.$queryRawUnsafe(
      'SELECT * FROM "PasswordResetOtp" WHERE "userId"=$1 AND "code"=$2 AND "expiresAt" > $3 AND "usedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 1',
      user.id,
      code,
      now
    );
    const otp = rows && rows.length ? rows[0] : null;
    if (!otp) {
      await logEvent('USER_RESET_FAIL', 'OTP reset: código inválido o vencido', { userId: user.id });
      return new Response(JSON.stringify({ error: 'INVALID_DNI_OR_CODE' }), { status: 400 });
    }

    // Actualizar password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.$executeRawUnsafe('UPDATE "PasswordResetOtp" SET "usedAt"=$1 WHERE "id"=$2', now, otp.id),
    ]);

    await logEvent('USER_RESET_OK', 'OTP reset: contraseña actualizada', { userId: user.id });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    await logEvent('USER_RESET_ERROR', 'OTP reset: error', { message: String(e?.message || e) });
    return new Response(JSON.stringify({ error: 'INTERNAL' }), { status: 500 });
  }
}
