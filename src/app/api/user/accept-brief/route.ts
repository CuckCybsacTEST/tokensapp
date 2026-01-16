import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isValidDay(day: string | null): day is string {
  return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

export async function GET(req: Request) {
  try {
    const uRaw = getUserCookie(req);
    const uSession = await verifyUserSessionCookie(uRaw);
    if (!uSession) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const url = new URL(req.url);
    const day = url.searchParams.get('day');
    if (!isValidDay(day)) return NextResponse.json({ ok: false, code: 'INVALID_DAY' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: uSession.userId }, select: { personId: true } });
    if (!user?.personId) return NextResponse.json({ ok: false, code: 'USER_WITHOUT_PERSON' }, { status: 400 });

    const existing = await prisma.briefAcceptance.findUnique({
      where: { personId_day: { personId: user.personId, day } }
    });

    return NextResponse.json({ ok: true, accepted: !!existing });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const uRaw = getUserCookie(req);
    const uSession = await verifyUserSessionCookie(uRaw);
    if (!uSession) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => null) as { day?: string } | null;
    const day = (body?.day || '').trim();
    if (!isValidDay(day)) return NextResponse.json({ ok: false, code: 'INVALID_DAY' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: uSession.userId }, select: { personId: true } });
    if (!user?.personId) return NextResponse.json({ ok: false, code: 'USER_WITHOUT_PERSON' }, { status: 400 });

    // Check if already accepted
    const existing = await prisma.briefAcceptance.findUnique({
      where: { personId_day: { personId: user.personId, day } }
    });
    if (existing) return NextResponse.json({ ok: true, alreadyAccepted: true });

    // Create acceptance
    await prisma.briefAcceptance.create({
      data: {
        personId: user.personId,
        day,
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}