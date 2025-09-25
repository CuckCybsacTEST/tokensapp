import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimitCustom } from '@/lib/rateLimit';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from '@/lib/auth-user';
import { computeBusinessDayFromUtc, getConfiguredCutoffHour } from '@/lib/attendanceDay';

export const dynamic = 'force-dynamic';

type Mode = 'IN' | 'OUT';
const REPLAY_WINDOW_SEC = 10;
const OUT_COOLDOWN_SEC = 60; // minimal time after IN before allowing OUT

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || '0.0.0.0';
    const body = await req.json().catch(() => null);
    if (!body || (body.mode !== 'IN' && body.mode !== 'OUT')) {
      return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
    }
  const mode = body.mode as Mode;
  const deviceId: string | undefined = typeof body.deviceId === 'string' ? body.deviceId : undefined;

    // Auth: require collaborator user session
    const raw = getUserCookie(req);
    const uSession = await verifyUserCookie(raw);
    if (!uSession) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    // Rate limit per IP and per userId (10 req / 10s each)
    const rlIp = checkRateLimitCustom(`att:${ip}${deviceId ? ':' + deviceId : ''}`, 10, 10_000);
    if (!rlIp.ok) return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429, headers: { 'Retry-After': String(rlIp.retryAfterSeconds) } });
    const rlUser = checkRateLimitCustom(`att:user:${uSession.userId}`, 10, 10_000);
    if (!rlUser.ok) return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429, headers: { 'Retry-After': String(rlUser.retryAfterSeconds) } });

    // Load user -> personId (Prisma)
    const user = await prisma.user.findUnique({ where: { id: uSession.userId }, select: { id: true, personId: true } });
    if (!user || !user.personId) return NextResponse.json({ ok: false, code: 'USER_NOT_FOUND' }, { status: 404 });
    const personId: string = user.personId;

    // Check person is active and get code/name (Prisma)
    const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true, code: true, name: true, active: true } });
    if (!person) return NextResponse.json({ ok: false, code: 'PERSON_NOT_FOUND' }, { status: 404 });
    if (!person.active) return NextResponse.json({ ok: false, code: 'PERSON_INACTIVE' }, { status: 400 });

    // Anti-replay: reject duplicate within window
    const since = new Date(Date.now() - REPLAY_WINDOW_SEC * 1000);
    const lastRecent = await prisma.scan.findFirst({ where: { personId: person.id, scannedAt: { gte: since } }, orderBy: { scannedAt: 'desc' }, select: { id: true, scannedAt: true } });
    if (lastRecent) {
      await prisma.eventLog.create({ data: { type: 'SCAN_DUPLICATE', message: person.code, metadata: JSON.stringify({ personId: person.id, type: mode }) } });
      return NextResponse.json({ ok: false, code: 'DUPLICATE', person: { id: person.id, name: person.name, code: person.code }, lastScanAt: lastRecent.scannedAt }, { status: 400 });
    }

  const useBusinessDay = process.env.ATTENDANCE_BUSINESS_DAY === '1';
    if (useBusinessDay) {
      // Business Day logic
      const businessDay = computeBusinessDayFromUtc(new Date(), getConfiguredCutoffHour());

      const alreadyToday = await prisma.scan.findFirst({ where: { personId: person.id, type: mode, businessDay }, orderBy: { scannedAt: 'asc' }, select: { id: true, scannedAt: true } });
      if (alreadyToday) {
        await prisma.eventLog.create({ data: { type: 'SCAN_ALREADY_MARKED', message: person.code, metadata: JSON.stringify({ personId: person.id, type: mode }) } });
        return NextResponse.json({ ok: false, code: 'ALREADY_TODAY', alreadyMarkedAt: alreadyToday.scannedAt }, { status: 400 });
      }

      if (mode === 'OUT') {
        const lastIn = await prisma.scan.findFirst({ where: { personId: person.id, type: 'IN', businessDay }, orderBy: { scannedAt: 'desc' }, select: { id: true, scannedAt: true } });
        const hasInToday = !!lastIn;
        if (!hasInToday) {
          await prisma.eventLog.create({ data: { type: 'SCAN_OUT_WITHOUT_IN', message: person.code, metadata: JSON.stringify({ personId: person.id }) } });
          return NextResponse.json({ ok: false, code: 'NO_IN_TODAY' }, { status: 400 });
        }
        // Enforce cooldown since last IN
        if (lastIn) {
          const elapsed = (Date.now() - new Date(lastIn.scannedAt).getTime()) / 1000;
          if (elapsed < OUT_COOLDOWN_SEC) {
            const wait = Math.ceil(OUT_COOLDOWN_SEC - elapsed);
            await prisma.eventLog.create({ data: { type: 'SCAN_OUT_COOLDOWN', message: person.code, metadata: JSON.stringify({ personId: person.id, wait }) } });
            return NextResponse.json({ ok: false, code: 'OUT_COOLDOWN', waitSeconds: wait }, { status: 400 });
          }
        }
      }
      const now = new Date();
      const created = await prisma.scan.create({
        data: {
          personId: person.id,
          scannedAt: now,
          type: mode,
          deviceId: deviceId || null,
          byUser: uSession.userId,
          meta: null,
          businessDay,
        },
        select: { id: true },
      });
      const scanId = created.id;
      await prisma.eventLog.create({ data: { type: 'SCAN_OK', message: person.code, metadata: JSON.stringify({ personId: person.id, type: mode, businessDay }) } });
      // Provide undo window hint for client when OUT
      const undoWindowMs = mode === 'OUT' ? 30_000 : 0;
      return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, scanId, businessDay, alerts: [], undoWindowMs }, { status: 200 });
    } else {
      // Legacy UTC-day logic (fallback) but still store computed businessDay for metrics compatibility
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const businessDayLegacy = computeBusinessDayFromUtc(now, getConfiguredCutoffHour());
      const already = await prisma.scan.findFirst({
        where: { personId: person.id, type: mode, scannedAt: { gte: start, lt: end } },
        orderBy: { scannedAt: 'asc' },
        select: { id: true, scannedAt: true },
      });
      if (already) {
        await prisma.eventLog.create({ data: { type: 'SCAN_ALREADY_MARKED_LEGACY', message: person.code, metadata: JSON.stringify({ personId: person.id, type: mode }) } });
        return NextResponse.json({ ok: false, code: 'ALREADY_TODAY', alreadyMarkedAt: already.scannedAt }, { status: 400 });
      }
      if (mode === 'OUT') {
        const hasIn = !!(await prisma.scan.findFirst({ where: { personId: person.id, type: 'IN', scannedAt: { gte: start, lt: end } }, orderBy: { scannedAt: 'asc' }, select: { id: true } }));
        if (!hasIn) {
          await prisma.eventLog.create({ data: { type: 'SCAN_OUT_WITHOUT_IN_LEGACY', message: person.code, metadata: JSON.stringify({ personId: person.id }) } });
          return NextResponse.json({ ok: false, code: 'NO_IN_TODAY' }, { status: 400 });
        }
      }
      const createdLegacy = await prisma.scan.create({
        data: {
          personId: person.id,
          scannedAt: now,
          type: mode,
          deviceId: deviceId || null,
          byUser: uSession.userId,
          meta: null,
          businessDay: businessDayLegacy,
        },
        select: { id: true },
      });
      const scanId = createdLegacy.id;
      await prisma.eventLog.create({ data: { type: 'SCAN_OK_LEGACY', message: person.code, metadata: JSON.stringify({ personId: person.id, type: mode, utcDay: start.toISOString().slice(0,10), businessDay: businessDayLegacy }) } });
      return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, scanId, utcDay: start.toISOString().slice(0,10), businessDay: businessDayLegacy, alerts: [] });
    }
  } catch (e: any) {
    console.error('attendance mark error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
