import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from '@/lib/auth-user';
import { computeBusinessDayFromUtc, getConfiguredCutoffHour } from '@/lib/attendanceDay';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const raw = getUserCookie(req);
    const u = await verifyUserCookie(raw);
    if (!u) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const useBusinessDay = process.env.ATTENDANCE_BUSINESS_DAY === '1';
    const cutoff = getConfiguredCutoffHour();
    const todayBD = computeBusinessDayFromUtc(new Date(), cutoff);

    // 1. Cargar persona y (opcional) últimos scans sólo del businessDay actual si flag activado.
    if (useBusinessDay) {
      const found = await prisma.user.findUnique({
        where: { id: u.userId },
        select: {
          person: {
            select: {
              code: true,
              name: true,
              scans: {
                where: { businessDay: todayBD },
                select: { id: true, scannedAt: true, type: true, deviceId: true, businessDay: true },
                orderBy: { scannedAt: 'desc' },
                take: 2 // hasta 2 para detectar si ya hubo IN y OUT
              },
            },
          },
        },
      });
      const p = found?.person;
      const scans = p?.scans || [];
      const last = scans[0] || null;
      const hasIn = scans.some(s => s.type === 'IN');
      const hasOut = scans.some(s => s.type === 'OUT');
      const recent = last ? { ...last, code: p?.code, name: p?.name } : null;
      return NextResponse.json({ ok: true, recent, businessDay: todayBD, completed: hasIn && hasOut });
    } else {
      // Legacy: conservar comportamiento anterior (último scan global) para no romper flujo antiguo.
      const found = await prisma.user.findUnique({
        where: { id: u.userId },
        select: {
          person: {
            select: {
              code: true,
              name: true,
              scans: { select: { id: true, scannedAt: true, type: true, deviceId: true, businessDay: true }, orderBy: { scannedAt: 'desc' }, take: 1 },
            },
          },
        },
      });
      const scan = found?.person?.scans?.[0] || null;
      const recent = scan ? { ...scan, code: found?.person?.code, name: found?.person?.name } : null;
      return NextResponse.json({ ok: true, recent });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
