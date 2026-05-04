import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000; // UTC-5

function toLima(date: Date): Date {
  return new Date(date.getTime() + LIMA_OFFSET_MS);
}

/** Returns {month: 1-12, day: 1-31} of a Lima-local date */
function limaParts(d: Date) {
  const local = toLima(d);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1, // 1-based
    day: local.getUTCDate(),
    dow: local.getUTCDay(), // 0=Sun, 1=Mon ... 6=Sat
  };
}

export type StaffBirthday = {
  personId: string;
  name: string;
  area: string | null;
  jobTitle: string | null;
  birthdayMonth: number;
  birthdayDay: number;
  /** ISO date string YYYY-MM-DD representing birthday in the current year */
  birthdayThisYear: string;
  group: 'today' | 'thisWeek' | 'thisMonth';
};

export async function GET() {
  try {
    const raw = cookies().get('user_session')?.value;
    const session = await verifyUserSessionCookie(raw);
    if (!session) {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const now = new Date();
    const today = limaParts(now);

    // Compute the Monday of this week (Lima local)
    const limaToday = toLima(now);
    const limaMonday = new Date(limaToday);
    const diffToMon = (limaToday.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
    limaMonday.setUTCDate(limaToday.getUTCDate() - diffToMon);
    const limaSunday = new Date(limaMonday);
    limaSunday.setUTCDate(limaMonday.getUTCDate() + 6);

    const weekStart = { month: limaMonday.getUTCMonth() + 1, day: limaMonday.getUTCDate() };
    const weekEnd = { month: limaSunday.getUTCMonth() + 1, day: limaSunday.getUTCDate() };

    // Fetch all active persons with a birthday set
    const persons = await prisma.person.findMany({
      where: {
        active: true,
        birthday: { not: null },
      },
      select: {
        id: true,
        name: true,
        area: true,
        jobTitle: true,
        birthday: true,
      },
      orderBy: [{ name: 'asc' }],
    });

    const results: StaffBirthday[] = [];

    for (const p of persons) {
      if (!p.birthday) continue;

      const bday = p.birthday as Date;
      const bMonth = bday.getUTCMonth() + 1;
      const bDay = bday.getUTCDate();

      // Skip if birthday month is not this month
      if (bMonth !== today.month) continue;

      const birthdayThisYear = `${today.year}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`;

      let group: 'today' | 'thisWeek' | 'thisMonth';

      if (bDay === today.day) {
        group = 'today';
      } else {
        // Is it in the current calendar week?
        const inWeek = isInWeek(bMonth, bDay, weekStart, weekEnd);
        group = inWeek ? 'thisWeek' : 'thisMonth';
      }

      results.push({
        personId: p.id,
        name: p.name,
        area: p.area,
        jobTitle: p.jobTitle,
        birthdayMonth: bMonth,
        birthdayDay: bDay,
        birthdayThisYear,
        group,
      });
    }

    // Sort: today first, then by day ascending
    results.sort((a, b) => {
      const order = { today: 0, thisWeek: 1, thisMonth: 2 };
      if (order[a.group] !== order[b.group]) return order[a.group] - order[b.group];
      return a.birthdayDay - b.birthdayDay;
    });

    return NextResponse.json({
      ok: true,
      birthdays: results,
      meta: {
        currentMonth: today.month,
        currentDay: today.day,
        todayCount: results.filter(r => r.group === 'today').length,
        thisWeekCount: results.filter(r => r.group === 'thisWeek').length,
        thisMonthCount: results.filter(r => r.group === 'thisMonth').length,
      },
    });
  } catch (error) {
    console.error('[STAFF_BIRTHDAYS_ERROR]', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

/**
 * Returns true if {month, day} falls within the week defined by weekStart..weekEnd.
 * Handles same-month weeks only for simplicity (cross-month is rare and thisMonth already ensures same month).
 */
function isInWeek(
  month: number,
  day: number,
  weekStart: { month: number; day: number },
  weekEnd: { month: number; day: number },
): boolean {
  // Compare as number: month*100+day for easy range check within same year
  const val = month * 100 + day;
  const start = weekStart.month * 100 + weekStart.day;
  const end = weekEnd.month * 100 + weekEnd.day;
  if (start <= end) return val >= start && val <= end;
  // Week straddles month boundary (e.g. Jan 28 – Feb 3) – handle by unwrapping
  return val >= start || val <= end;
}
