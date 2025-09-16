import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';
import { checkRateLimit } from '@/lib/rateLimit';
import { isBirthdaysEnabledPublic } from '@/lib/featureFlags';

// Simple placeholder: define fixed timeSlots and max reservations per slot
const DEFAULT_SLOTS = ['22:00', '23:00', '00:00'];
const MAX_PER_SLOT = 5; // placeholder cap

export async function GET(req: NextRequest) {
  if (!isBirthdaysEnabledPublic()) {
    return apiError('NOT_FOUND', 'Not found', undefined, 404);
  }
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const rl = checkRateLimit(`birthdays:slots:${ip}`);
  if (!rl.ok) {
    return apiError('RATE_LIMITED', 'Too many requests', undefined, 429, { 'Retry-After': String(rl.retryAfterSeconds) });
  }
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date'); // expected YYYY-MM-DD
    if (!dateStr) return apiError('INVALID_DATE', 'date (YYYY-MM-DD) is required', undefined, 400);
    const date = new Date(dateStr + 'T00:00:00.000Z');
    if (!isFinite(date.getTime())) return apiError('INVALID_DATE', 'invalid date', undefined, 400);

    const sameDayStart = date;
    const sameDayEnd = new Date(date);
    sameDayEnd.setUTCDate(date.getUTCDate() + 1);

    const reservations = await prisma.birthdayReservation.findMany({
      where: {
        date: { gte: sameDayStart, lt: sameDayEnd },
        status: { in: ['pending_review', 'approved'] },
      },
      select: { timeSlot: true },
    });
    const counts = Object.fromEntries(DEFAULT_SLOTS.map((s) => [s, 0])) as Record<string, number>;
    for (const r of reservations) counts[r.timeSlot] = (counts[r.timeSlot] || 0) + 1;
    const slots = DEFAULT_SLOTS.map((slot) => ({ slot, remaining: Math.max(0, MAX_PER_SLOT - (counts[slot] || 0)) }));
    return apiOk({ date: dateStr, slots });
  } catch (e) {
    return apiError('SLOTS_FETCH_ERROR', 'Failed to compute availability');
  }
}
