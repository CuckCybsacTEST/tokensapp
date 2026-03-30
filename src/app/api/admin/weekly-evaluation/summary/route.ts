import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/weekly-evaluation/summary?week=YYYY-MM-DD
 * week param = the Monday of the desired week.
 * Returns an array of 7 daily summaries (Mon→Sun) using the same logic
 * as /api/admin/daily-evaluation/summary.
 */
export async function GET(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'COORDINATOR'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const weekParam = req.nextUrl.searchParams.get('week');
    if (!weekParam) return NextResponse.json({ error: 'week param required (YYYY-MM-DD of Monday)' }, { status: 400 });

    // Build 7 day strings Mon→Sun
    const monday = new Date(weekParam + 'T12:00:00Z');
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }

    const results = await Promise.all(days.map(day => getDaySummary(day)));

    return NextResponse.json({ week: weekParam, days: results });
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getDaySummary(day: string) {
  // ── Time windows ──────────────────────────────────────────────
  const dayDate = new Date(day + 'T00:00:00');
  const startUtc = new Date(dayDate.getTime() + 15 * 60 * 60 * 1000); // 10 AM Lima = 15:00 UTC
  const nextDay = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);
  const endUtc   = new Date(nextDay.getTime()  + 15 * 60 * 60 * 1000);

  const [fY, fM, fD] = day.split('-').map(Number);
  const fStart = new Date(Date.UTC(fY, fM - 1, fD,     5, 0, 0, 0));
  const fEnd   = new Date(Date.UTC(fY, fM - 1, fD + 1, 4, 59, 59, 999));

  const dayStart = new Date(day + 'T00:00:00');
  const dayEnd   = new Date(day + 'T23:59:59.999');

  // ── 1. Attendance ─────────────────────────────────────────────
  const scans = await prisma.scan.findMany({
    where: { businessDay: day },
    include: { person: { select: { id: true, name: true, code: true, area: true } } },
    orderBy: { scannedAt: 'asc' },
  });

  const personMap = new Map<string, {
    person: { id: string; name: string; code: string; area: string | null };
    firstIn: Date | null; lastOut: Date | null; hasExit: boolean;
  }>();
  for (const s of scans) {
    if (!personMap.has(s.personId)) {
      personMap.set(s.personId, { person: s.person, firstIn: null, lastOut: null, hasExit: false });
    }
    const e = personMap.get(s.personId)!;
    if (s.type === 'IN'  && (!e.firstIn || s.scannedAt < e.firstIn)) e.firstIn = s.scannedAt;
    if (s.type === 'OUT') { e.hasExit = true; if (!e.lastOut || s.scannedAt > e.lastOut) e.lastOut = s.scannedAt; }
  }

  const attendance = Array.from(personMap.values()).map(a => ({
    person: a.person,
    firstIn: a.firstIn?.toISOString() ?? null,
    lastOut: a.lastOut?.toISOString() ?? null,
    missingExit: !a.hasExit,
  }));

  // ── 2. Delivered prizes (roulette bracelets) ──────────────────
  const deliveredTokens = await prisma.token.findMany({
    where: {
      deliveredAt: { gte: startUtc, lt: endUtc },
      batch: { isReusable: false, staticTargetUrl: null },
    },
    include: { prize: { select: { id: true, label: true } } },
  });

  const prizeDeliveryMap = new Map<string, { label: string; count: number }>();
  for (const t of deliveredTokens) {
    const label = t.prize?.label ?? 'Sin premio';
    const existing = prizeDeliveryMap.get(label);
    if (existing) existing.count++;
    else prizeDeliveryMap.set(label, { label, count: 1 });
  }
  const deliveredPrizes = Array.from(prizeDeliveryMap.values()).sort((a, b) => b.count - a.count);

  // ── 3. Total bracelets ────────────────────────────────────────
  const totalTokensInBatches = await prisma.token.count({
    where: {
      batch: { isReusable: false, staticTargetUrl: null, functionalDate: { gte: fStart, lte: fEnd } },
    },
  });

  // ── 4. Reusable sales (redemptions type=deliver) ──────────────
  const reusableGroups = await prisma.tokenGroup.findMany({
    where: { locked: false },
    include: {
      tokens: {
        include: {
          prize: { select: { id: true, label: true } },
          redemptions: {
            where: { type: 'deliver', createdAt: { gte: startUtc, lt: endUtc } },
          },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  let totalReusableSales = 0;
  const reusableGroupsSummary = reusableGroups.map(g => {
    let daySales = 0;
    const prizeAcc: Record<string, { label: string; total: number; daySales: number }> = {};
    for (const t of g.tokens) {
      const key = t.prize.id;
      if (!prizeAcc[key]) prizeAcc[key] = { label: t.prize.label, total: 0, daySales: 0 };
      prizeAcc[key].total++;
      const tokenDaySales = t.redemptions.length;
      prizeAcc[key].daySales += tokenDaySales;
      daySales += tokenDaySales;
    }
    totalReusableSales += daySales;
    return {
      id: g.id, name: g.name, color: g.color,
      totalTokens: g.tokens.length,
      activeTokens: g.tokens.filter(t => !t.disabled).length,
      daySales,
      prizes: Object.values(prizeAcc),
    };
  });

  // ── 5. Birthdays ──────────────────────────────────────────────
  const bdays = await prisma.birthdayReservation.findMany({
    where: { date: { gte: dayStart, lte: dayEnd }, status: { not: 'canceled' } },
    select: {
      id: true, celebrantName: true, timeSlot: true, guestsPlanned: true,
      guestArrivals: true, hostArrivedAt: true, status: true,
      pack: { select: { name: true } },
    },
    orderBy: { timeSlot: 'asc' },
  });

  const birthdaySummary = {
    total: bdays.length,
    arrived: bdays.filter(r => r.hostArrivedAt).length,
    totalGuests: bdays.reduce((s, r) => s + r.guestsPlanned, 0),
    arrivedGuests: bdays.reduce((s, r) => s + r.guestArrivals, 0),
    reservations: bdays.map(r => ({
      id: r.id, celebrantName: r.celebrantName, timeSlot: r.timeSlot,
      status: r.status, guestsPlanned: r.guestsPlanned, guestArrivals: r.guestArrivals,
      hostArrived: !!r.hostArrivedAt, packName: r.pack?.name ?? null,
    })),
  };

  // ── 6. Special events ─────────────────────────────────────────
  const events = await prisma.specialEvent.findMany({
    where: { date: { gte: dayStart, lte: dayEnd }, status: { not: 'cancelled' } },
    select: {
      id: true, name: true, timeSlot: true,
      invitations: {
        where: { status: { not: 'cancelled' } },
        select: { id: true, guestName: true, status: true, arrivedAt: true, guestCategory: true },
      },
    },
    orderBy: { timeSlot: 'asc' },
  });

  const allInv = events.flatMap(e => e.invitations.map(inv => ({
    ...inv, eventName: e.name, eventTime: e.timeSlot, arrivedAt: inv.arrivedAt?.toISOString() ?? null,
  })));
  const arrivedInv = allInv.filter(i => i.status === 'arrived');

  const specialGuestsSummary = {
    total: allInv.length,
    arrived: arrivedInv.length,
    events: events.map(e => ({
      id: e.id, name: e.name, timeSlot: e.timeSlot,
      totalGuests: e.invitations.length,
      arrivedGuests: e.invitations.filter(i => i.status === 'arrived').length,
    })),
  };

  // ── 7. Evaluation ─────────────────────────────────────────────
  const evaluation = await prisma.dailyEvaluation.findUnique({ where: { businessDay: day } });

  return {
    day,
    attendance,
    deliveredPrizes,
    totalDelivered: deliveredTokens.length,
    totalTokensInBatches,
    totalReusableSales,
    reusableGroups: reusableGroupsSummary,
    birthdays: birthdaySummary,
    specialGuests: specialGuestsSummary,
    evaluation: evaluation ? {
      rating: evaluation.rating,
      comment: evaluation.comment,
      closedAt: evaluation.closedAt?.toISOString() ?? null,
    } : null,
  };
}
