import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPersonPayload, PersonQrPayload, CURRENT_SIGNATURE_VERSION } from '@/lib/signing';
import { checkRateLimitCustom } from '@/lib/rateLimit';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from '@/lib/auth';
import { computeBusinessDayFromUtc, getConfiguredCutoffHour } from '@/lib/attendanceDay';

// Anti-replay window in seconds (reject duplicate scans for same person in this window)
const REPLAY_WINDOW_SEC = 10;

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || '0.0.0.0';
    // Parse body early to include deviceId in rate-limit key if present
    const body = await req.json().catch(() => null);
    const deviceId: string | undefined = body && typeof body.deviceId === 'string' ? body.deviceId : undefined;
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

    // Branch 1: signed person payload flow (personal QR codes)
    if (typeof body.payload === 'object' && body.payload) {
      const payload = body.payload as PersonQrPayload;
      const type = (body.type === 'OUT' ? 'OUT' : 'IN') as 'IN' | 'OUT';

      const secret = process.env.TOKEN_SECRET || '';
      if (!secret) return NextResponse.json({ ok: false, code: 'SERVER_MISCONFIG' }, { status: 500 });

      // Validate signature version first
      if (payload.v !== undefined && payload.v !== CURRENT_SIGNATURE_VERSION) {
        await prisma.eventLog.create({ data: { type: 'SCAN_INVALID', message: 'VERSION', metadata: JSON.stringify({ v: payload.v, expected: CURRENT_SIGNATURE_VERSION }) } });
        return NextResponse.json({ ok: false, code: 'INVALID_VERSION' }, { status: 401 });
      }

      // Verify signature and timestamp skew
      const res = verifyPersonPayload(secret, payload, { maxSkewSec: 86400 });
      if (!res.ok) {
        await prisma.eventLog.create({ data: { type: 'SCAN_INVALID', message: res.code, metadata: JSON.stringify({ pid: payload.pid }) } });
        return NextResponse.json({ ok: false, code: res.code }, { status: 401 });
      }

      const person = await prisma.person.findUnique({
        where: { id: payload.pid },
        select: { id: true, code: true, name: true, active: true },
      });
      if (!person) return NextResponse.json({ ok: false, code: 'PERSON_NOT_FOUND' }, { status: 400 });
      if (!person.active) return NextResponse.json({ ok: false, code: 'PERSON_INACTIVE' }, { status: 400 });

      // Compute the business day for this scan (handles late-night shift cutoff)
      const businessDay = computeBusinessDayFromUtc(new Date(), getConfiguredCutoffHour());

      // Per-businessDay single mark per direction: if already marked, return OK with notice
      const alreadyToday = await prisma.scan.findFirst({
        where: { personId: person.id, type, businessDay },
        orderBy: { scannedAt: 'asc' },
        select: { id: true, scannedAt: true },
      });
      if (alreadyToday) {
        await prisma.eventLog.create({ data: { type: 'SCAN_ALREADY_MARKED', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });
        return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, alerts: ['already_marked'], alreadyMarkedAt: alreadyToday.scannedAt });
      }

      // Anti-replay: reject duplicate scans for the same person within REPLAY_WINDOW_SEC
      const since = new Date(Date.now() - REPLAY_WINDOW_SEC * 1000);
      const lastRecent = await prisma.scan.findFirst({
        where: { personId: person.id, scannedAt: { gte: since } },
        orderBy: { scannedAt: 'desc' },
        select: { id: true, scannedAt: true },
      });
      if (lastRecent) {
        await prisma.eventLog.create({ data: { type: 'SCAN_DUPLICATE', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });
        return NextResponse.json({
          ok: false,
          code: 'DUPLICATE',
          person: { id: person.id, name: person.name, code: person.code },
          lastScanAt: lastRecent.scannedAt,
          alerts: ['duplicate'],
        }, { status: 400 });
      }

      const created = await prisma.scan.create({
        data: {
          personId: person.id,
          scannedAt: new Date(),
          type,
          deviceId: deviceId ?? null,
          byUser: uSession?.userId ?? null,
          meta: null,
          businessDay,
        },
        select: { id: true },
      });

      await prisma.eventLog.create({ data: { type: 'SCAN_OK', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });
      return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, scanId: created.id, alerts: [] });
    }

    // Branch 2: code + type flow (global QR poster → manual code entry)
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

      const person = await prisma.person.findFirst({
        where: { code: { equals: normCode, mode: 'insensitive' } },
        select: { id: true, code: true, name: true, active: true },
      });
      if (!person) return NextResponse.json({ ok: false, code: 'PERSON_NOT_FOUND' }, { status: 400 });
      if (!person.active) return NextResponse.json({ ok: false, code: 'PERSON_INACTIVE' }, { status: 400 });

      // Compute the business day for this scan (handles late-night shift cutoff)
      const businessDay = computeBusinessDayFromUtc(new Date(), getConfiguredCutoffHour());

      // Anti-replay: reject duplicate scans for the same person within REPLAY_WINDOW_SEC
      const since = new Date(Date.now() - REPLAY_WINDOW_SEC * 1000);
      const lastRecent = await prisma.scan.findFirst({
        where: { personId: person.id, scannedAt: { gte: since } },
        orderBy: { scannedAt: 'desc' },
        select: { id: true, scannedAt: true },
      });
      if (lastRecent) {
        await prisma.eventLog.create({ data: { type: 'SCAN_DUPLICATE', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });
        return NextResponse.json({
          ok: false,
          code: 'DUPLICATE',
          person: { id: person.id, name: person.name, code: person.code },
          lastScanAt: lastRecent.scannedAt,
          alerts: ['duplicate'],
        }, { status: 400 });
      }

      // Per-businessDay single mark per direction: if already marked, return OK with notice
      const alreadyToday = await prisma.scan.findFirst({
        where: { personId: person.id, type, businessDay },
        orderBy: { scannedAt: 'asc' },
        select: { id: true, scannedAt: true },
      });
      if (alreadyToday) {
        await prisma.eventLog.create({ data: { type: 'SCAN_ALREADY_MARKED', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });
        return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, alerts: ['already_marked'], alreadyMarkedAt: alreadyToday.scannedAt });
      }

      const created = await prisma.scan.create({
        data: {
          personId: person.id,
          scannedAt: new Date(),
          type,
          deviceId: deviceId ?? null,
          byUser: uSession?.userId ?? null,
          meta: null,
          businessDay,
        },
        select: { id: true },
      });

      await prisma.eventLog.create({ data: { type: 'SCAN_OK', message: person.code, metadata: JSON.stringify({ personId: person.id, type }) } });
      return NextResponse.json({ ok: true, person: { id: person.id, name: person.name, code: person.code }, scanId: created.id, alerts: [] });
    }

    // If neither flow matched
    return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  } catch (e: any) {
    console.error('scan endpoint error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
