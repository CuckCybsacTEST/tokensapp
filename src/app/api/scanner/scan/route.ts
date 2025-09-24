import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPersonPayload, PersonQrPayload, CURRENT_SIGNATURE_VERSION } from '@/lib/signing';
import { checkRateLimitCustom } from '@/lib/rateLimit';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from '@/lib/auth-user';

// Anti-replay window in seconds (reject duplicate scans for same person in this window)
const REPLAY_WINDOW_SEC = 10;

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || '0.0.0.0';
    // Parse body early to include deviceId in rate-limit key if present
    const body = await req.json().catch(() => null);
    const deviceId: string | undefined = body && typeof body.deviceId === 'string' ? body.deviceId : undefined;
    const esc = (s: string) => s.replace(/'/g, "''");
    const key = deviceId ? `scan:${ip}:${deviceId}` : `scan:${ip}`;
    // 10 requests per 10 seconds per IP or per (IP+deviceId) if provided
    const rl = checkRateLimitCustom(key, 10, 10_000);
    if (!rl.ok) return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } });
    if (!body) {
      return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
    }

    // Pull sessions once
    const adminRaw = getSessionCookieFromRequest(req);
    const adminSession = await verifySessionCookie(adminRaw);
    const userRaw = getUserCookie(req);
    const uSession = await verifyUserCookie(userRaw);

    // Branch 1: signed person payload flow (existing)
    if (typeof body.payload === 'object' && body.payload) {
      const payload = body.payload as PersonQrPayload;
      const type = (body.type === 'OUT' ? 'OUT' : 'IN') as 'IN' | 'OUT';
      // deviceId already parsed above

      const secret = process.env.TOKEN_SECRET || '';
      if (!secret) return NextResponse.json({ ok: false, code: 'SERVER_MISCONFIG' }, { status: 500 });

      // Validate signature version first
      if (payload.v !== undefined && payload.v !== CURRENT_SIGNATURE_VERSION) {
        await prisma.eventLog.create({ data: { type: 'SCAN_INVALID', message: 'VERSION', metadata: JSON.stringify({ v: payload.v, expected: CURRENT_SIGNATURE_VERSION }) } });
        return NextResponse.json({ ok: false, code: 'INVALID_VERSION' }, { status: 401 });
      }

      // Verify signature and timestamp skew
      const res = verifyPersonPayload(secret, payload, { maxSkewSec: 86400 }); // allow up to 24h old codes by default
      if (!res.ok) {
        await prisma.eventLog.create({ data: { type: 'SCAN_INVALID', message: res.code, metadata: JSON.stringify({ pid: payload.pid }) } });
        return NextResponse.json({ ok: false, code: res.code }, { status: 401 });
      }

      // Note: if Prisma Client types are stale, use raw query fallback
      const personRows: any[] = await prisma.$queryRawUnsafe(`SELECT id, code, name, active FROM Person WHERE id = '${payload.pid}' LIMIT 1`);
      const person = personRows && personRows[0];
      if (!person) return NextResponse.json({ ok: false, code: 'PERSON_NOT_FOUND' }, { status: 400 });
      if (!person.active) return NextResponse.json({ ok: false, code: 'PERSON_INACTIVE' }, { status: 400 });

      // Per-day single mark per direction: if already marked today for this type, return OK with notice
      const nowA = new Date();
      const dayStartA = new Date(nowA);
      dayStartA.setHours(0, 0, 0, 0);
      const nextDayStartA = new Date(dayStartA.getTime() + 24 * 60 * 60 * 1000);
      const alreadyTodayRowsA: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, scannedAt FROM Scan WHERE personId='${person.id}' AND type='${type}' AND scannedAt >= '${dayStartA.toISOString()}' AND scannedAt < '${nextDayStartA.toISOString()}' ORDER BY scannedAt ASC LIMIT 1`
      );
      const alreadyTodayA = alreadyTodayRowsA && alreadyTodayRowsA[0];
      if (alreadyTodayA) {
        await prisma.eventLog.create({ data: { type: 'SCAN_ALREADY_MARKED', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });
        return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, alerts: ['already_marked'], alreadyMarkedAt: alreadyTodayA.scannedAt });
      }

      // Per-day single mark per direction: if already marked today for this type, return OK with notice
      const nowB = new Date();
      const dayStartB = new Date(nowB);
      dayStartB.setHours(0, 0, 0, 0);
      const nextDayStartB = new Date(dayStartB.getTime() + 24 * 60 * 60 * 1000);
      const alreadyTodayRowsB: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, scannedAt FROM Scan WHERE personId='${person.id}' AND type='${type}' AND scannedAt >= '${dayStartB.toISOString()}' AND scannedAt < '${nextDayStartB.toISOString()}' ORDER BY scannedAt ASC LIMIT 1`
      );
      const alreadyTodayB = alreadyTodayRowsB && alreadyTodayRowsB[0];
      if (alreadyTodayB) {
        await prisma.eventLog.create({ data: { type: 'SCAN_ALREADY_MARKED', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });
        return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, alerts: ['already_marked'], alreadyMarkedAt: alreadyTodayB.scannedAt });
      }

      // Anti-replay: if last scan within REPLAY_WINDOW_SEC, treat as duplicate
      const since = new Date(Date.now() - REPLAY_WINDOW_SEC * 1000);
      const lastRecentRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, scannedAt FROM Scan WHERE personId = '${person.id}' AND scannedAt >= '${since.toISOString()}' ORDER BY scannedAt DESC LIMIT 1`
      );
      const lastRecent = lastRecentRows && lastRecentRows[0];
      if (lastRecent) {
        await prisma.eventLog.create({ data: { type: 'SCAN_DUPLICATE', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });
        return NextResponse.json({
          ok: false,
          code: 'DUPLICATE',
          person: { id: person.id, name: person.name, code: person.code },
          lastScanAt: lastRecent.scannedAt,
          alerts: ['duplicate']
        }, { status: 400 });
      }

      // No day-level duplicate existed; proceed to insert

      const nowIso = new Date().toISOString();
      const scanIdRows: any[] = await prisma.$queryRawUnsafe(
        `INSERT INTO Scan (personId, scannedAt, type, deviceId, byUser, meta, createdAt)
         VALUES ('${person.id}', '${nowIso}', '${type}', ${deviceId ? `'${esc(deviceId)}'` : 'NULL'}, ${uSession ? `'${esc(uSession.userId)}'` : 'NULL'}, NULL, '${nowIso}') RETURNING id`
      );
      const scanId = scanIdRows?.[0]?.id;

      await prisma.eventLog.create({ data: { type: 'SCAN_OK', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });

      return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, scanId, alerts: [] });
    }

    // Branch 2: code + type flow (kiosk/global QR)
    if (typeof body.code === 'string' && body.code.trim()) {
      // Allow either admin/staff session OR collaborator user session
      const adminOk = requireRole(adminSession, ['ADMIN', 'STAFF']).ok;
      if (!adminOk && !uSession) {
        return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
      }

      const normCode = body.code.trim().toUpperCase();
      // Additional rate limit by code
      const rlCode = checkRateLimitCustom(`scan:code:${normCode}`, 10, 10_000);
      if (!rlCode.ok) return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429, headers: { 'Retry-After': String(rlCode.retryAfterSeconds) } });

      const type = (body.type === 'OUT' ? 'OUT' : 'IN') as 'IN' | 'OUT';

      // Find person by code (case-insensitive)
      const personRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, code, name, active FROM Person WHERE upper(code) = upper('${normCode.replace(/'/g, "''")}') LIMIT 1`
      );
      const person = personRows && personRows[0];
      if (!person) return NextResponse.json({ ok: false, code: 'PERSON_NOT_FOUND' }, { status: 400 });
      if (!person.active) return NextResponse.json({ ok: false, code: 'PERSON_INACTIVE' }, { status: 400 });

      // Anti-replay: if last scan within REPLAY_WINDOW_SEC, treat as duplicate
      const since = new Date(Date.now() - REPLAY_WINDOW_SEC * 1000);
      const lastRecentRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, scannedAt FROM Scan WHERE personId = '${person.id}' AND scannedAt >= '${since.toISOString()}' ORDER BY scannedAt DESC LIMIT 1`
      );
      const lastRecent = lastRecentRows && lastRecentRows[0];
      if (lastRecent) {
        await prisma.eventLog.create({ data: { type: 'SCAN_DUPLICATE', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });
        return NextResponse.json({
          ok: false,
          code: 'DUPLICATE',
          person: { id: person.id, name: person.name, code: person.code },
          lastScanAt: lastRecent.scannedAt,
          alerts: ['duplicate']
        }, { status: 400 });
      }

      // Look at last scan (any time) to possibly warn about same direction
      const lastAnyRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT type, scannedAt FROM Scan WHERE personId='${person.id}' ORDER BY scannedAt DESC LIMIT 1`
      );
      const lastAny = lastAnyRows && lastAnyRows[0];

      const nowIso = new Date().toISOString();
      const scanIdRows: any[] = await prisma.$queryRawUnsafe(
        `INSERT INTO Scan (personId, scannedAt, type, deviceId, byUser, meta, createdAt)
         VALUES ('${person.id}', '${nowIso}', '${type}', ${deviceId ? `'${esc(deviceId)}'` : 'NULL'}, ${uSession ? `'${esc(uSession.userId)}'` : 'NULL'}, NULL, '${nowIso}') RETURNING id`
      );
      const scanId = scanIdRows?.[0]?.id;

      await prisma.eventLog.create({ data: { type: 'SCAN_OK', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });

      return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, scanId, alerts: [] });
    }

    // If neither flow matched
    return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  } catch (e: any) {
    console.error('scan endpoint error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
