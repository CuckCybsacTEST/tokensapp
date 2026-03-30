import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Mirrors the logic in /api/admin/daily-evaluation/summary exactly.
 * Business-day window: day 10:00 Lima (15:00 UTC) → day+1 10:00 Lima (15:00 UTC).
 * functionalDate window: day 05:00 UTC → day+1 04:59:59.999 UTC.
 */
async function getSummaryForDay(day: string) {
  console.log(`\n=== Resumen para ${day} ===`);

  // ── Time windows (same as the API) ────────────────────────────
  const dayDate = new Date(day + 'T00:00:00');
  const startUtc = new Date(dayDate.getTime() + 15 * 60 * 60 * 1000); // 10:00 Lima = 15:00 UTC
  const nextDay  = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);
  const endUtc   = new Date(nextDay.getTime()  + 15 * 60 * 60 * 1000);

  const [fY, fM, fD] = day.split('-').map(Number);
  const fStart = new Date(Date.UTC(fY, fM - 1, fD,     5, 0, 0, 0));
  const fEnd   = new Date(Date.UTC(fY, fM - 1, fD + 1, 4, 59, 59, 999));

  const dayStart = new Date(day + 'T00:00:00');
  const dayEnd   = new Date(day + 'T23:59:59.999');

  // ── 1. Asistencia ─────────────────────────────────────────────
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

  const attendance = Array.from(personMap.values());
  console.log(`Asistencia: ${attendance.length} colaboradores`);
  const missing = attendance.filter(a => !a.hasExit);
  if (missing.length) {
    console.log(`  - ${missing.length} sin marcar salida`);
    missing.forEach(a => console.log(`    * ${a.person.name} (${a.person.code})`));
  }

  // ── 2. Premios entregados (pulseras ruleta) ───────────────────
  const deliveredTokens = await prisma.token.findMany({
    where: {
      deliveredAt: { gte: startUtc, lt: endUtc },
      batch: { isReusable: false, staticTargetUrl: null },
    },
    include: { prize: { select: { label: true } } },
  });

  const prizeMap = new Map<string, number>();
  for (const t of deliveredTokens) {
    const l = t.prize?.label ?? 'Sin premio';
    prizeMap.set(l, (prizeMap.get(l) || 0) + 1);
  }
  const deliveredPrizes = Array.from(prizeMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  console.log(`Premios entregados: ${deliveredTokens.length}`);
  deliveredPrizes.forEach(p => console.log(`  - ${p.label}: ${p.count}`));

  // ── 3. Total pulseras del día ─────────────────────────────────
  const totalTokens = await prisma.token.count({
    where: {
      batch: { isReusable: false, staticTargetUrl: null, functionalDate: { gte: fStart, lte: fEnd } },
    },
  });
  console.log(`Total pulseras: ${totalTokens}`);

  // ── 4. Premios ruleta del día (distintos) ─────────────────────
  const batchTokenPrizes = await prisma.token.findMany({
    where: {
      batch: { isReusable: false, staticTargetUrl: null, functionalDate: { gte: fStart, lte: fEnd } },
    },
    select: { prize: { select: { id: true, label: true } } },
  });
  const uniquePrizes = new Map<string, string>();
  for (const t of batchTokenPrizes) if (t.prize) uniquePrizes.set(t.prize.id, t.prize.label);
  console.log(`Premios ruleta del día: ${uniquePrizes.size}`);

  // ── 5. Ventas reutilizables (redemptions type=deliver) ────────
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
  const groupSales: { name: string; color: string | null; sales: number; prizes: Map<string, { label: string; count: number }> }[] = [];

  for (const g of reusableGroups) {
    let gSales = 0;
    const gPrizes = new Map<string, { label: string; count: number }>();
    for (const t of g.tokens) {
      const sales = t.redemptions.length;
      if (sales > 0) {
        gSales += sales;
        const key = t.prize.id;
        const existing = gPrizes.get(key);
        if (existing) existing.count += sales;
        else gPrizes.set(key, { label: t.prize.label, count: sales });
      }
    }
    totalReusableSales += gSales;
    if (gSales > 0) {
      groupSales.push({ name: g.name, color: g.color, sales: gSales, prizes: gPrizes });
    }
  }

  console.log(`Ventas reutilizables: ${totalReusableSales}`);
  for (const gs of groupSales.sort((a, b) => b.sales - a.sales)) {
    console.log(`  [${gs.name}] ${gs.sales} ventas`);
    const prizes = Array.from(gs.prizes.values()).sort((a, b) => b.count - a.count);
    prizes.forEach(p => console.log(`    - ${p.label}: ${p.count}`));
  }

  // ── 6. Cumpleaños ─────────────────────────────────────────────
  const bdays = await prisma.birthdayReservation.findMany({
    where: { date: { gte: dayStart, lte: dayEnd }, status: { not: 'canceled' } },
    select: {
      celebrantName: true, timeSlot: true, guestsPlanned: true,
      guestArrivals: true, hostArrivedAt: true, pack: { select: { name: true } },
    },
    orderBy: { timeSlot: 'asc' },
  });

  const bdayArrived = bdays.filter(r => r.hostArrivedAt).length;
  const bdayGuests  = bdays.reduce((s, r) => s + r.guestsPlanned, 0);
  const bdayGuestsA = bdays.reduce((s, r) => s + r.guestArrivals, 0);
  console.log(`Cumpleaños: ${bdays.length} reservas, ${bdayArrived} llegaron, ${bdayGuestsA}/${bdayGuests} invitados`);
  bdays.forEach(r => {
    console.log(`  - ${r.celebrantName} (${r.timeSlot}, ${r.pack?.name ?? '?'}): ${r.hostArrivedAt ? 'Llegó' : 'Esperando'} — ${r.guestArrivals}/${r.guestsPlanned} inv.`);
  });

  // ── 7. Invitados especiales ───────────────────────────────────
  const events = await prisma.specialEvent.findMany({
    where: { date: { gte: dayStart, lte: dayEnd }, status: { not: 'cancelled' } },
    select: {
      name: true, timeSlot: true,
      invitations: {
        where: { status: { not: 'cancelled' } },
        select: { guestName: true, status: true, arrivedAt: true },
      },
    },
    orderBy: { timeSlot: 'asc' },
  });

  const allInv = events.flatMap(e => e.invitations);
  const arrivedInv = allInv.filter(i => i.status === 'arrived');
  console.log(`Invitados especiales: ${allInv.length} total, ${arrivedInv.length} llegaron`);
  events.forEach(e => {
    const ea = e.invitations.filter(i => i.status === 'arrived').length;
    console.log(`  - ${e.name} (${e.timeSlot}): ${ea}/${e.invitations.length}`);
  });
}

async function main() {
  const days = ['2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28'];
  for (const day of days) await getSummaryForDay(day);
}

main().catch(console.error).finally(() => prisma.$disconnect());