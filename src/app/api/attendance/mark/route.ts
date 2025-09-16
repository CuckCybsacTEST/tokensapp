import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimitCustom } from '@/lib/rateLimit';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from '@/lib/auth-user';

type Mode = 'IN' | 'OUT';
const REPLAY_WINDOW_SEC = 10;

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || '0.0.0.0';
    const body = await req.json().catch(() => null);
    if (!body || (body.mode !== 'IN' && body.mode !== 'OUT')) {
      return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
    }
    const mode = body.mode as Mode;
    const deviceId: string | undefined = typeof body.deviceId === 'string' ? body.deviceId : undefined;
    const esc = (s: string) => s.replace(/'/g, "''");

    // Auth: require collaborator user session
    const raw = getUserCookie(req);
    const uSession = await verifyUserCookie(raw);
    if (!uSession) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    // Rate limit per IP and per userId (10 req / 10s each)
    const rlIp = checkRateLimitCustom(`att:${ip}${deviceId ? ':' + deviceId : ''}`, 10, 10_000);
    if (!rlIp.ok) return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429, headers: { 'Retry-After': String(rlIp.retryAfterSeconds) } });
    const rlUser = checkRateLimitCustom(`att:user:${uSession.userId}`, 10, 10_000);
    if (!rlUser.ok) return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429, headers: { 'Retry-After': String(rlUser.retryAfterSeconds) } });

    // Load user -> personId
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT u.id as userId, u.personId as personId FROM User u WHERE u.id='${esc(uSession.userId)}' LIMIT 1`
    );
    const row = rows && rows[0];
    if (!row) return NextResponse.json({ ok: false, code: 'USER_NOT_FOUND' }, { status: 404 });
    const personId: string = row.personId;

    // Check person is active and get code/name
    const personRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, code, name, active FROM Person WHERE id='${esc(personId)}' LIMIT 1`
    );
    const person = personRows && personRows[0];
    if (!person) return NextResponse.json({ ok: false, code: 'PERSON_NOT_FOUND' }, { status: 404 });
    if (!person.active) return NextResponse.json({ ok: false, code: 'PERSON_INACTIVE' }, { status: 400 });

    // Anti-replay: reject duplicate within window
    const since = new Date(Date.now() - REPLAY_WINDOW_SEC * 1000);
    const lastRecentRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, scannedAt FROM Scan WHERE personId = '${person.id}' AND scannedAt >= '${since.toISOString()}' ORDER BY scannedAt DESC LIMIT 1`
    );
    const lastRecent = lastRecentRows && lastRecentRows[0];
    if (lastRecent) {
      await prisma.eventLog.create({ data: { type: 'SCAN_DUPLICATE', message: person.code, metadata: JSON.stringify({ personId: person.id, type: mode }) } });
      return NextResponse.json({ ok: false, code: 'DUPLICATE', person: { id: person.id, name: person.name, code: person.code }, lastScanAt: lastRecent.scannedAt }, { status: 400 });
    }

  // Per-day single mark per direction: if already marked today for this type, block with error
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const nextDayStart = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const alreadyTodayRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, scannedAt FROM Scan WHERE personId='${person.id}' AND type='${mode}' AND scannedAt >= '${dayStart.toISOString()}' AND scannedAt < '${nextDayStart.toISOString()}' ORDER BY scannedAt ASC LIMIT 1`
    );
    const alreadyToday = alreadyTodayRows && alreadyTodayRows[0];
    if (alreadyToday) {
      await prisma.eventLog.create({ data: { type: 'SCAN_ALREADY_MARKED', message: person.code, metadata: JSON.stringify({ personId: person.id, type: mode }) } });
      return NextResponse.json({ ok: false, code: 'ALREADY_TODAY', alreadyMarkedAt: alreadyToday.scannedAt }, { status: 400 });
    }

    // Sequence rule: OUT requires a prior IN today
    if (mode === 'OUT') {
      const inTodayRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, scannedAt FROM Scan WHERE personId='${person.id}' AND type='IN' AND scannedAt >= '${dayStart.toISOString()}' AND scannedAt < '${nextDayStart.toISOString()}' ORDER BY scannedAt ASC LIMIT 1`
      );
      const hasInToday = !!(inTodayRows && inTodayRows[0]);
      if (!hasInToday) {
        await prisma.eventLog.create({ data: { type: 'SCAN_OUT_WITHOUT_IN', message: person.code, metadata: JSON.stringify({ personId: person.id }) } });
        return NextResponse.json({ ok: false, code: 'NO_IN_TODAY' }, { status: 400 });
      }
    }

    // Insert scan
    const nowIso = new Date().toISOString();
    await prisma.$executeRawUnsafe(
      `INSERT INTO Scan (id, personId, scannedAt, type, deviceId, byUser, meta, createdAt) VALUES (replace(hex(randomblob(16)),'',''), '${person.id}', '${nowIso}', '${mode}', ${deviceId ? `'${esc(deviceId)}'` : 'NULL'}, '${esc(uSession.userId)}', NULL, '${nowIso}')`
    );
    const scanIdRows: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM Scan WHERE personId='${person.id}' ORDER BY createdAt DESC LIMIT 1`);
    const scanId = scanIdRows && scanIdRows[0]?.id;

    await prisma.eventLog.create({ data: { type: 'SCAN_OK', message: person.code, metadata: JSON.stringify({ personId: person.id, type: mode }) } });

    return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, scanId, alerts: [] });
  } catch (e: any) {
    console.error('attendance mark error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
