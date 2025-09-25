import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { logEvent } from '@/lib/log';
import { checkRateLimitCustom } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function genCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid similar-looking 0/O/1/I
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    // Allow ADMIN or STAFF to generate OTPs
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const id = String(params?.id || '').trim();
    if (!id) return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });

    // Basic abuse limiting: per user and per IP, small window
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || '0.0.0.0';
    const rl1 = checkRateLimitCustom(`otp:user:${id}`, 5, 5 * 60_000);
    if (!rl1.ok) return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429, headers: { 'Retry-After': String(rl1.retryAfterSeconds) } });
    const rl2 = checkRateLimitCustom(`otp:ip:${ip}`, 20, 5 * 60_000);
    if (!rl2.ok) return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429, headers: { 'Retry-After': String(rl2.retryAfterSeconds) } });

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, personId: true, person: { select: { dni: true, name: true } } } });
    if (!user) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });

    const code = genCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    // Raw insert to avoid needing regenerated Prisma Client model
    const otpId = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await prisma.$executeRawUnsafe(
      'INSERT INTO "PasswordResetOtp" ("id","userId","code","expiresAt","createdAt") VALUES ($1,$2,$3,$4,$5)',
      otpId,
      user.id,
      code,
      expiresAt,
      new Date()
    );
    await logEvent('ADMIN_OTP_CREATED', 'Se generó OTP de reseteo', { userId: user.id, username: user.username, person: user.person });
    return NextResponse.json({ ok: true, code, expiresAt });
  } catch (e: any) {
    await logEvent('ADMIN_OTP_ERROR', 'Error al generar OTP', { message: String(e?.message || e) });
    return NextResponse.json({ ok: false, code: 'INTERNAL' }, { status: 500 });
  }
}
