export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { businessDayWindowUtc, currentBusinessDay } from '@/lib/attendanceDay';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';

function parseDayParam(input: string | null): string {
  if (!input) return currentBusinessDay();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new Error('DAY_INVALID');
  }
  return input;
}

export async function GET(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(raw);
    if (!session) {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        username: true,
        person: { select: { name: true, area: true } },
      },
    });
    if (!viewer) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const category = url.searchParams.get('category') === 'birthday' ? 'birthday' : 'reusable';
    if (!userId) {
      return NextResponse.json({ ok: false, code: 'USER_ID_REQUIRED' }, { status: 400 });
    }

    const canSeeOthers = viewer.role === 'ADMIN' || viewer.role === 'COORDINATOR';
    if (!canSeeOthers && userId !== viewer.id) {
      return NextResponse.json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });
    }

    let day: string;
    try {
      day = parseDayParam(url.searchParams.get('day'));
    } catch {
      return NextResponse.json({ ok: false, code: 'INVALID_DAY', message: 'day must be YYYY-MM-DD' }, { status: 400 });
    }
    const { startUtc, endUtc } = businessDayWindowUtc(day);

    const operator = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        person: { select: { name: true, area: true } },
      },
    });
    if (!operator) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
    }

    const events = category === 'birthday'
      ? await prisma.tokenRedemption.findMany({
          where: {
            by: userId,
            reservationId: { not: null },
            redeemedAt: { gte: startUtc, lt: endUtc },
          },
          select: {
            id: true,
            redeemedAt: true,
            location: true,
            token: { select: { kind: true } },
            reservation: { select: { celebrantName: true, timeSlot: true } },
          },
          orderBy: { redeemedAt: 'desc' },
        })
      : await prisma.reusableTokenRedemption.findMany({
          where: {
            userId,
            createdAt: { gte: startUtc, lt: endUtc },
          },
          select: {
            id: true,
            type: true,
            createdAt: true,
            token: {
              select: {
                prize: { select: { label: true } },
                group: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

    return NextResponse.json({
      ok: true,
      day,
      category,
      operator: {
        userId: operator.id,
        displayName: operator.person?.name || operator.username,
        username: operator.username,
        role: operator.role,
        area: operator.person?.area || null,
      },
      events: category === 'birthday'
        ? events.map((event: any) => ({
            id: event.id,
            type: typeof event.location === 'string' && event.location.startsWith('host:') ? 'host' : 'guest',
            label: event.reservation?.celebrantName || 'Cumpleanos',
            groupName: (typeof event.location === 'string' && event.location.startsWith('host:')) ? 'Cumpleanero' : `Invitado${event.reservation?.timeSlot ? ` · ${event.reservation.timeSlot}` : ''}`,
            createdAt: event.redeemedAt.toISOString(),
          }))
        : events.map((event: any) => ({
            id: event.id,
            type: event.type,
            label: event.token.prize.label,
            groupName: event.token.group?.name || null,
            createdAt: event.createdAt.toISOString(),
          })),
    });
  } catch (error: any) {
    console.error('Error fetching journey history:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR', message: String(error?.message || error) }, { status: 500 });
  }
}