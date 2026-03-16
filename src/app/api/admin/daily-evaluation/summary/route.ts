import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/daily-evaluation/summary?day=YYYY-MM-DD
// Returns: attendance, delivered prizes, active prizes for the given business day
export async function GET(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'COORDINATOR', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const day = req.nextUrl.searchParams.get('day');
    if (!day) return NextResponse.json({ error: 'day param required' }, { status: 400 });

    // Attendance: people who scanned IN this business day
    const scans = await prisma.scan.findMany({
      where: { businessDay: day },
      include: { person: { select: { id: true, name: true, code: true, area: true } } },
      orderBy: { scannedAt: 'asc' },
    });

    // Group scans by person
    const personMap = new Map<string, {
      person: { id: string; name: string; code: string; area: string | null };
      firstIn: Date | null;
      lastOut: Date | null;
      hasExit: boolean;
    }>();

    for (const scan of scans) {
      if (!personMap.has(scan.personId)) {
        personMap.set(scan.personId, {
          person: scan.person,
          firstIn: null,
          lastOut: null,
          hasExit: false,
        });
      }
      const entry = personMap.get(scan.personId)!;
      if (scan.type === 'IN' && (!entry.firstIn || scan.scannedAt < entry.firstIn)) {
        entry.firstIn = scan.scannedAt;
      }
      if (scan.type === 'OUT') {
        entry.hasExit = true;
        if (!entry.lastOut || scan.scannedAt > entry.lastOut) {
          entry.lastOut = scan.scannedAt;
        }
      }
    }

    const attendance = Array.from(personMap.values()).map((a) => ({
      person: a.person,
      firstIn: a.firstIn?.toISOString() ?? null,
      lastOut: a.lastOut?.toISOString() ?? null,
      missingExit: !a.hasExit,
    }));

    // Delivered roulette prizes for this business day
    // Business day maps to a date range: day 10:00 AM to day+1 10:00 AM (Lima UTC-5)
    const dayDate = new Date(day + 'T00:00:00');
    const startUtc = new Date(dayDate.getTime() + 10 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000); // 10:00 Lima = 15:00 UTC
    const nextDay = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);
    const endUtc = new Date(nextDay.getTime() + 10 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000);

    const deliveredTokens = await prisma.token.findMany({
      where: {
        deliveredAt: { gte: startUtc, lt: endUtc },
        batch: { isReusable: false, staticTargetUrl: null },
      },
      include: {
        prize: { select: { id: true, label: true } },
      },
    });

    // Group by prize label
    const prizeDeliveryMap = new Map<string, { label: string; count: number }>();
    for (const t of deliveredTokens) {
      const label = t.prize?.label ?? 'Sin premio';
      const existing = prizeDeliveryMap.get(label);
      if (existing) {
        existing.count++;
      } else {
        prizeDeliveryMap.set(label, { label, count: 1 });
      }
    }
    const deliveredPrizes = Array.from(prizeDeliveryMap.values()).sort((a, b) => b.count - a.count);

    // Distinct prizes from today's batches (using functionalDate)
    // functionalDate is stored as 05:00 UTC (Lima midnight)
    const [fY, fM, fD] = day.split('-').map(Number);
    const fStart = new Date(Date.UTC(fY, fM - 1, fD, 5, 0, 0, 0));
    const fEnd = new Date(Date.UTC(fY, fM - 1, fD + 1, 4, 59, 59, 999));

    const batchTokens = await prisma.token.findMany({
      where: {
        batch: {
          isReusable: false,
          staticTargetUrl: null,
          functionalDate: { gte: fStart, lte: fEnd },
        },
      },
      select: {
        prize: { select: { id: true, label: true } },
      },
    });

    // Deduplicate by prize id
    const prizeMap = new Map<string, { id: string; label: string }>();
    for (const t of batchTokens) {
      if (t.prize && !prizeMap.has(t.prize.id)) {
        prizeMap.set(t.prize.id, { id: t.prize.id, label: t.prize.label });
      }
    }
    const dayPrizes = Array.from(prizeMap.values()).sort((a, b) => a.label.localeCompare(b.label));

    // Birthday reservations for this day
    const dayStart = new Date(day + 'T00:00:00');
    const dayEnd = new Date(day + 'T23:59:59.999');
    const birthdayReservations = await prisma.birthdayReservation.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        status: { not: 'canceled' },
      },
      select: {
        id: true,
        celebrantName: true,
        timeSlot: true,
        status: true,
        guestsPlanned: true,
        guestArrivals: true,
        hostArrivedAt: true,
        pack: { select: { name: true } },
      },
      orderBy: { timeSlot: 'asc' },
    });

    const birthdaySummary = {
      total: birthdayReservations.length,
      arrived: birthdayReservations.filter(r => r.hostArrivedAt).length,
      totalGuests: birthdayReservations.reduce((s, r) => s + r.guestsPlanned, 0),
      arrivedGuests: birthdayReservations.reduce((s, r) => s + r.guestArrivals, 0),
      reservations: birthdayReservations.map(r => ({
        id: r.id,
        celebrantName: r.celebrantName,
        timeSlot: r.timeSlot,
        status: r.status,
        guestsPlanned: r.guestsPlanned,
        guestArrivals: r.guestArrivals,
        hostArrived: !!r.hostArrivedAt,
        packName: r.pack?.name ?? null,
      })),
    };

    // Special event invitations for this day
    const specialEvents = await prisma.specialEvent.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        status: { not: 'cancelled' },
      },
      select: {
        id: true,
        name: true,
        timeSlot: true,
        invitations: {
          where: { status: { not: 'cancelled' } },
          select: {
            id: true,
            guestName: true,
            guestCategory: true,
            status: true,
            arrivedAt: true,
          },
        },
      },
      orderBy: { timeSlot: 'asc' },
    });

    const allInvitations = specialEvents.flatMap(e =>
      e.invitations.map(inv => ({
        ...inv,
        eventName: e.name,
        eventTime: e.timeSlot,
        arrivedAt: inv.arrivedAt?.toISOString() ?? null,
      }))
    );
    const arrivedInvitations = allInvitations.filter(i => i.status === 'arrived');
    const lastArrival = arrivedInvitations.length > 0
      ? arrivedInvitations.reduce((latest, i) => {
          if (!latest || (i.arrivedAt && i.arrivedAt > latest)) return i.arrivedAt;
          return latest;
        }, null as string | null)
      : null;

    const specialGuestsSummary = {
      total: allInvitations.length,
      arrived: arrivedInvitations.length,
      lastArrivalAt: lastArrival,
      events: specialEvents.map(e => ({
        id: e.id,
        name: e.name,
        timeSlot: e.timeSlot,
        totalGuests: e.invitations.length,
        arrivedGuests: e.invitations.filter(i => i.status === 'arrived').length,
      })),
      guests: allInvitations.map(i => ({
        id: i.id,
        guestName: i.guestName,
        guestCategory: i.guestCategory,
        status: i.status,
        arrivedAt: i.arrivedAt,
        eventName: i.eventName,
        eventTime: i.eventTime,
      })),
    };

    // Reusable token groups — count deliveries for THIS business day
    const reusableGroups = await prisma.tokenGroup.findMany({
      where: { locked: false },
      include: {
        tokens: {
          include: {
            prize: { select: { id: true, label: true } },
            redemptions: {
              where: {
                type: 'deliver',
                createdAt: { gte: startUtc, lt: endUtc },
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const reusableGroupsSummary = reusableGroups.map(g => {
      let daySales = 0;
      const prizeAcc: Record<string, { label: string; total: number; daySales: number }> = {};
      for (const t of g.tokens) {
        const key = t.prize.id;
        if (!prizeAcc[key]) prizeAcc[key] = { label: t.prize.label, total: 0, daySales: 0 };
        prizeAcc[key].total++;
        const tokenDaySales = t.redemptions.length; // already filtered by day+type in query
        prizeAcc[key].daySales += tokenDaySales;
        daySales += tokenDaySales;
      }
      return {
        id: g.id,
        name: g.name,
        color: g.color,
        totalTokens: g.tokens.length,
        activeTokens: g.tokens.filter(t => !t.disabled).length,
        daySales,
        prizes: Object.values(prizeAcc),
      };
    });

    return NextResponse.json({
      attendance,
      deliveredPrizes,
      totalDelivered: deliveredTokens.length,
      dayPrizes,
      totalTokensInBatches: batchTokens.length,
      birthdays: birthdaySummary,
      specialGuests: specialGuestsSummary,
      reusableGroups: reusableGroupsSummary,
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
