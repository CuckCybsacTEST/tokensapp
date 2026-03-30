export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/weekly-evaluation/export-pdf?week=YYYY-MM-DD
 * Generates a full PDF report for the given week (Mon→Sun).
 */
export async function GET(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'COORDINATOR'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const weekParam = req.nextUrl.searchParams.get('week');
    if (!weekParam) return NextResponse.json({ error: 'week param required' }, { status: 400 });

    // Fetch full week data (same logic as summary route)
    const monday = new Date(weekParam + 'T12:00:00Z');
    const dayStrings: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      dayStrings.push(d.toISOString().slice(0, 10));
    }

    const days = await Promise.all(dayStrings.map(day => getDaySummary(day)));

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 595.28; // A4
    const PAGE_H = 841.89;
    const MARGIN = 40;
    const LINE_H = 14;
    const COL_W = PAGE_W - 2 * MARGIN;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function ensureSpace(needed: number) {
      if (y - needed < MARGIN) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
    }

    // pdf-lib standard fonts only support WinAnsi — strip control chars & unsupported Unicode
    function sanitize(text: string): string {
      return text.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/[^\x20-\x7e\xa0-\xff]/g, '');
    }

    function drawText(text: string, x: number, size: number, bold = false, color = rgb(0.1, 0.1, 0.1)) {
      const f = bold ? fontBold : font;
      page.drawText(sanitize(text), { x, y, size, font: f, color });
    }

    function drawLine() {
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    }

    const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const RATING_LABELS: Record<string, string> = { MALO: 'Malo', REGULAR: 'Regular', BUENO: 'Bueno', MUY_BUENO: 'Muy Bueno' };

    const sundayDate = new Date(monday);
    sundayDate.setDate(sundayDate.getDate() + 6);
    const sundayStr = sundayDate.toISOString().slice(0, 10);

    // ── Title ────────────────────────────────
    drawText('Evaluación Semanal', MARGIN, 18, true);
    y -= LINE_H * 1.5;
    drawText(`Semana: ${weekParam} al ${sundayStr}`, MARGIN, 10, false, rgb(0.4, 0.4, 0.4));
    y -= LINE_H * 1.5;
    drawLine();
    y -= LINE_H;

    // ── Week Totals ──────────────────────────
    const totals = days.reduce((acc, d) => {
      acc.attendance += d.attendance.length;
      acc.missingExits += d.attendance.filter((a: any) => a.missingExit).length;
      acc.delivered += d.totalDelivered;
      acc.bracelets += d.totalTokensInBatches;
      acc.reusableSales += d.totalReusableSales;
      acc.birthdays += d.birthdays.total;
      acc.birthdaysArrived += d.birthdays.arrived;
      acc.specialGuests += d.specialGuests.total;
      acc.specialGuestsArrived += d.specialGuests.arrived;
      return acc;
    }, { attendance: 0, missingExits: 0, delivered: 0, bracelets: 0, reusableSales: 0, birthdays: 0, birthdaysArrived: 0, specialGuests: 0, specialGuestsArrived: 0 });

    drawText('RESUMEN SEMANAL', MARGIN, 12, true, rgb(0.15, 0.15, 0.5));
    y -= LINE_H * 1.2;

    const summaryLines = [
      `Jornadas incompletas: ${totals.missingExits} de ${totals.attendance} registros`,
      `Productos canjeados: ${totals.delivered} con ${totals.bracelets} pulseras`,
      `Tokens reutilizables: ${totals.reusableSales} veces escaneados`,
      `Cumpleaños: ${totals.birthdaysArrived} llegaron de ${totals.birthdays} reservas`,
      `Invitados especiales: ${totals.specialGuestsArrived} llegaron de ${totals.specialGuests}`,
    ];
    for (const line of summaryLines) {
      ensureSpace(LINE_H);
      drawText(`• ${line}`, MARGIN + 8, 9);
      y -= LINE_H;
    }

    // ── Week prizes aggregated ───────────────
    const weekPrizeMap = new Map<string, number>();
    for (const d of days) for (const p of d.deliveredPrizes) weekPrizeMap.set(p.label, (weekPrizeMap.get(p.label) || 0) + p.count);
    if (weekPrizeMap.size > 0) {
      y -= LINE_H * 0.5;
      ensureSpace(LINE_H * 2);
      drawText('Premios entregados:', MARGIN + 8, 9, true);
      y -= LINE_H;
      const sorted = Array.from(weekPrizeMap.entries()).sort((a, b) => b[1] - a[1]);
      for (const [label, count] of sorted) {
        ensureSpace(LINE_H);
        drawText(`  ${label}: ${count}`, MARGIN + 16, 8);
        y -= LINE_H;
      }
    }

    // ── Week reusable groups ─────────────────
    const weekReusable = new Map<string, { name: string; sales: number; prizes: Map<string, number> }>();
    for (const d of days) for (const g of d.reusableGroups) {
      if (g.daySales === 0) continue;
      if (!weekReusable.has(g.id)) weekReusable.set(g.id, { name: g.name, sales: 0, prizes: new Map() });
      const wg = weekReusable.get(g.id)!;
      wg.sales += g.daySales;
      for (const p of g.prizes) { if (p.daySales > 0) wg.prizes.set(p.label, (wg.prizes.get(p.label) || 0) + p.daySales); }
    }
    if (weekReusable.size > 0) {
      y -= LINE_H * 0.5;
      ensureSpace(LINE_H * 2);
      drawText('Ventas reutilizables por grupo:', MARGIN + 8, 9, true);
      y -= LINE_H;
      for (const g of weekReusable.values()) {
        ensureSpace(LINE_H * 2);
        drawText(`  ${g.name} — ${g.sales} ventas`, MARGIN + 16, 8, true);
        y -= LINE_H;
        for (const [label, count] of g.prizes.entries()) {
          ensureSpace(LINE_H);
          drawText(`    ${label}: ${count}`, MARGIN + 24, 8);
          y -= LINE_H;
        }
      }
    }

    y -= LINE_H;
    ensureSpace(LINE_H);
    drawLine();
    y -= LINE_H;

    // ── Daily Breakdown ──────────────────────
    for (let idx = 0; idx < days.length; idx++) {
      const d = days[idx];
      const dayLabel = `${DAY_NAMES[idx]} ${d.day}`;
      const hasActivity = d.attendance.length > 0 || d.totalDelivered > 0 || d.totalReusableSales > 0;

      ensureSpace(LINE_H * 3);
      drawText(dayLabel, MARGIN, 11, true, rgb(0.2, 0.2, 0.6));
      y -= LINE_H;

      if (!hasActivity && d.birthdays.total === 0 && d.specialGuests.total === 0) {
        drawText('Sin actividad', MARGIN + 8, 8, false, rgb(0.5, 0.5, 0.5));
        y -= LINE_H * 1.5;
        continue;
      }

      // Quick stats line
      const statParts: string[] = [];
      if (d.attendance.length > 0) statParts.push(`${d.attendance.length} colaboradores`);
      if (d.totalDelivered > 0) statParts.push(`${d.totalDelivered}/${d.totalTokensInBatches} premios`);
      if (d.totalReusableSales > 0) statParts.push(`${d.totalReusableSales} reutilizables`);
      if (d.birthdays.total > 0) statParts.push(`${d.birthdays.arrived}/${d.birthdays.total} cumpleaños`);
      if (d.specialGuests.total > 0) statParts.push(`${d.specialGuests.arrived}/${d.specialGuests.total} inv. esp.`);
      if (statParts.length > 0) {
        drawText(statParts.join('  |  '), MARGIN + 8, 8, false, rgb(0.35, 0.35, 0.35));
        y -= LINE_H;
      }

      // Evaluation
      if (d.evaluation) {
        const ratingLabel = d.evaluation.rating ? RATING_LABELS[d.evaluation.rating] || d.evaluation.rating : 'Sin calificar';
        ensureSpace(LINE_H);
        drawText(`Evaluación: ${ratingLabel}${d.evaluation.closedAt ? ' (Cerrada)' : ''}`, MARGIN + 8, 8, true, rgb(0.3, 0.3, 0.3));
        y -= LINE_H;
        if (d.evaluation.comment) {
          // Word-wrap comment — split on whitespace (including newlines)
          const words = sanitize(d.evaluation.comment).split(/\s+/).filter(Boolean);
          let line = '';
          for (const w of words) {
            const test = line ? `${line} ${w}` : w;
            if (font.widthOfTextAtSize(sanitize(test), 8) > COL_W - 32) {
              ensureSpace(LINE_H);
              drawText(`  "${line}"`, MARGIN + 16, 8, false, rgb(0.4, 0.4, 0.4));
              y -= LINE_H;
              line = w;
            } else {
              line = test;
            }
          }
          if (line) {
            ensureSpace(LINE_H);
            drawText(`  "${line}"`, MARGIN + 16, 8, false, rgb(0.4, 0.4, 0.4));
            y -= LINE_H;
          }
        }
      }

      // Attendance table
      if (d.attendance.length > 0) {
        ensureSpace(LINE_H * 2);
        drawText('Asistencia:', MARGIN + 8, 8, true);
        y -= LINE_H;
        const missingExits = d.attendance.filter((a: any) => a.missingExit).length;
        if (missingExits > 0) {
          drawText(`(${missingExits} sin marcar salida)`, MARGIN + 70, 7, false, rgb(0.7, 0.3, 0.1));
        }
        for (const a of d.attendance) {
          ensureSpace(LINE_H);
          const entry = fmtTime(a.firstIn);
          const exit = a.missingExit ? 'SIN SALIDA' : fmtTime(a.lastOut);
          drawText(`  ${a.person.name}`, MARGIN + 16, 7.5);
          drawText(`${a.person.area || '-'}`, MARGIN + 200, 7.5, false, rgb(0.5, 0.5, 0.5));
          drawText(`${entry} - ${exit}`, MARGIN + 320, 7.5, false, a.missingExit ? rgb(0.7, 0.3, 0.1) : rgb(0.3, 0.3, 0.3));
          y -= LINE_H;
        }
      }

      // Delivered prizes
      if (d.deliveredPrizes.length > 0) {
        ensureSpace(LINE_H * 2);
        drawText(`Premios entregados (${d.totalDelivered}):`, MARGIN + 8, 8, true);
        y -= LINE_H;
        for (const p of d.deliveredPrizes) {
          ensureSpace(LINE_H);
          drawText(`  ${p.label}: ${p.count}`, MARGIN + 16, 7.5);
          y -= LINE_H;
        }
      }

      // Reusable sales
      if (d.totalReusableSales > 0) {
        ensureSpace(LINE_H * 2);
        drawText(`Ventas reutilizables (${d.totalReusableSales}):`, MARGIN + 8, 8, true);
        y -= LINE_H;
        for (const g of d.reusableGroups) {
          if (g.daySales === 0) continue;
          ensureSpace(LINE_H);
          drawText(`  ${g.name}: ${g.daySales}`, MARGIN + 16, 7.5, true);
          y -= LINE_H;
          for (const p of g.prizes) {
            if (p.daySales === 0) continue;
            ensureSpace(LINE_H);
            drawText(`    ${p.label}: ${p.daySales}`, MARGIN + 24, 7);
            y -= LINE_H;
          }
        }
      }

      // Birthdays
      if (d.birthdays.total > 0) {
        ensureSpace(LINE_H * 2);
        drawText(`Cumpleaños (${d.birthdays.arrived}/${d.birthdays.total} llegaron, ${d.birthdays.arrivedGuests}/${d.birthdays.totalGuests} inv.):`, MARGIN + 8, 8, true);
        y -= LINE_H;
        for (const r of d.birthdays.reservations) {
          ensureSpace(LINE_H);
          const status = r.hostArrived ? '[Si]' : '[No]';
          drawText(`  ${status} ${r.timeSlot} - ${r.celebrantName} (${r.guestArrivals}/${r.guestsPlanned} inv.)`, MARGIN + 16, 7.5);
          y -= LINE_H;
        }
      }

      // Special guests
      if (d.specialGuests.total > 0) {
        ensureSpace(LINE_H * 2);
        drawText(`Invitados especiales (${d.specialGuests.arrived}/${d.specialGuests.total}):`, MARGIN + 8, 8, true);
        y -= LINE_H;
        for (const ev of d.specialGuests.events) {
          ensureSpace(LINE_H);
          drawText(`  ${ev.name} (${ev.timeSlot}): ${ev.arrivedGuests}/${ev.totalGuests} llegaron`, MARGIN + 16, 7.5);
          y -= LINE_H;
        }
      }

      y -= LINE_H * 0.5;
      ensureSpace(LINE_H);
      drawLine();
      y -= LINE_H * 0.5;
    }

    // ── Footer ───────────────────────────────
    ensureSpace(LINE_H * 2);
    y -= LINE_H;
    drawText(`Generado: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`, MARGIN, 7, false, rgb(0.6, 0.6, 0.6));

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="evaluacion-semanal-${weekParam}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating weekly PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────
function fmtTime(iso: string | null) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });
}

// ── getDaySummary — identical to summary route ──────────────
async function getDaySummary(day: string) {
  const dayDate = new Date(day + 'T00:00:00');
  const startUtc = new Date(dayDate.getTime() + 15 * 60 * 60 * 1000);
  const nextDay = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);
  const endUtc   = new Date(nextDay.getTime()  + 15 * 60 * 60 * 1000);

  const [fY, fM, fD] = day.split('-').map(Number);
  const fStart = new Date(Date.UTC(fY, fM - 1, fD,     5, 0, 0, 0));
  const fEnd   = new Date(Date.UTC(fY, fM - 1, fD + 1, 4, 59, 59, 999));

  const dayStart = new Date(day + 'T00:00:00');
  const dayEnd   = new Date(day + 'T23:59:59.999');

  // 1. Attendance
  const scans = await prisma.scan.findMany({
    where: { businessDay: day },
    include: { person: { select: { id: true, name: true, code: true, area: true } } },
    orderBy: { scannedAt: 'asc' },
  });
  const personMap = new Map<string, { person: { id: string; name: string; code: string; area: string | null }; firstIn: Date | null; lastOut: Date | null; hasExit: boolean }>();
  for (const s of scans) {
    if (!personMap.has(s.personId)) personMap.set(s.personId, { person: s.person, firstIn: null, lastOut: null, hasExit: false });
    const e = personMap.get(s.personId)!;
    if (s.type === 'IN'  && (!e.firstIn || s.scannedAt < e.firstIn)) e.firstIn = s.scannedAt;
    if (s.type === 'OUT') { e.hasExit = true; if (!e.lastOut || s.scannedAt > e.lastOut) e.lastOut = s.scannedAt; }
  }
  const attendance = Array.from(personMap.values()).map(a => ({
    person: a.person, firstIn: a.firstIn?.toISOString() ?? null, lastOut: a.lastOut?.toISOString() ?? null, missingExit: !a.hasExit,
  }));

  // 2. Delivered prizes
  const deliveredTokens = await prisma.token.findMany({
    where: { deliveredAt: { gte: startUtc, lt: endUtc }, batch: { isReusable: false, staticTargetUrl: null } },
    include: { prize: { select: { id: true, label: true } } },
  });
  const prizeMap = new Map<string, { label: string; count: number }>();
  for (const t of deliveredTokens) { const l = t.prize?.label ?? 'Sin premio'; const e = prizeMap.get(l); if (e) e.count++; else prizeMap.set(l, { label: l, count: 1 }); }
  const deliveredPrizes = Array.from(prizeMap.values()).sort((a, b) => b.count - a.count);

  // 3. Total bracelets
  const totalTokensInBatches = await prisma.token.count({
    where: { batch: { isReusable: false, staticTargetUrl: null, functionalDate: { gte: fStart, lte: fEnd } } },
  });

  // 4. Reusable sales
  const reusableGroups = await prisma.tokenGroup.findMany({
    where: { locked: false },
    include: { tokens: { include: { prize: { select: { id: true, label: true } }, redemptions: { where: { type: 'deliver', createdAt: { gte: startUtc, lt: endUtc } } } } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  let totalReusableSales = 0;
  const reusableGroupsSummary = reusableGroups.map(g => {
    let daySales = 0;
    const prizeAcc: Record<string, { label: string; total: number; daySales: number }> = {};
    for (const t of g.tokens) { const k = t.prize.id; if (!prizeAcc[k]) prizeAcc[k] = { label: t.prize.label, total: 0, daySales: 0 }; prizeAcc[k].total++; const s = t.redemptions.length; prizeAcc[k].daySales += s; daySales += s; }
    totalReusableSales += daySales;
    return { id: g.id, name: g.name, color: g.color, totalTokens: g.tokens.length, activeTokens: g.tokens.filter(t => !t.disabled).length, daySales, prizes: Object.values(prizeAcc) };
  });

  // 5. Birthdays
  const bdays = await prisma.birthdayReservation.findMany({
    where: { date: { gte: dayStart, lte: dayEnd }, status: { not: 'canceled' } },
    select: { id: true, celebrantName: true, timeSlot: true, guestsPlanned: true, guestArrivals: true, hostArrivedAt: true, status: true, pack: { select: { name: true } } },
    orderBy: { timeSlot: 'asc' },
  });
  const birthdaySummary = {
    total: bdays.length, arrived: bdays.filter(r => r.hostArrivedAt).length,
    totalGuests: bdays.reduce((s, r) => s + r.guestsPlanned, 0), arrivedGuests: bdays.reduce((s, r) => s + r.guestArrivals, 0),
    reservations: bdays.map(r => ({ id: r.id, celebrantName: r.celebrantName, timeSlot: r.timeSlot, status: r.status, guestsPlanned: r.guestsPlanned, guestArrivals: r.guestArrivals, hostArrived: !!r.hostArrivedAt, packName: r.pack?.name ?? null })),
  };

  // 6. Special events
  const events = await prisma.specialEvent.findMany({
    where: { date: { gte: dayStart, lte: dayEnd }, status: { not: 'cancelled' } },
    select: { id: true, name: true, timeSlot: true, invitations: { where: { status: { not: 'cancelled' } }, select: { id: true, guestName: true, status: true, arrivedAt: true, guestCategory: true } } },
    orderBy: { timeSlot: 'asc' },
  });
  const allInv = events.flatMap(e => e.invitations.map(inv => ({ ...inv, eventName: e.name, eventTime: e.timeSlot, arrivedAt: inv.arrivedAt?.toISOString() ?? null })));
  const specialGuestsSummary = { total: allInv.length, arrived: allInv.filter(i => i.status === 'arrived').length, events: events.map(e => ({ id: e.id, name: e.name, timeSlot: e.timeSlot, totalGuests: e.invitations.length, arrivedGuests: e.invitations.filter(i => i.status === 'arrived').length })) };

  // 7. Evaluation
  const evaluation = await prisma.dailyEvaluation.findUnique({ where: { businessDay: day } });

  return {
    day, attendance, deliveredPrizes, totalDelivered: deliveredTokens.length, totalTokensInBatches, totalReusableSales,
    reusableGroups: reusableGroupsSummary, birthdays: birthdaySummary, specialGuests: specialGuestsSummary,
    evaluation: evaluation ? { rating: evaluation.rating, comment: evaluation.comment, closedAt: evaluation.closedAt?.toISOString() ?? null } : null,
  };
}
