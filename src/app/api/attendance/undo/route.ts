import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie as verifyUserCookie } from '@/lib/auth-user';

export const dynamic = 'force-dynamic';

// Allow undoing an OUT scan within a short window by scanId
// Request: { scanId: string }
// Response: { ok: true } or { ok: false, code }

const UNDO_WINDOW_MS = 30_000; // 30 seconds

export async function POST(req: Request) {
  try {
    const raw = getUserCookie(req);
    const u = await verifyUserCookie(raw);
    if (!u) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const scanId: string | undefined = body?.scanId && typeof body.scanId === 'string' ? body.scanId : undefined;
    if (!scanId) return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });

    // Load the scan and ensure it belongs to the same person as the logged user
    const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { id: true, personId: true, type: true, scannedAt: true } });
    if (!scan) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });

    const user = await prisma.user.findUnique({ where: { id: u.userId }, select: { id: true, personId: true } });
    if (!user || !user.personId || user.personId !== scan.personId) {
      return NextResponse.json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });
    }

    if (scan.type !== 'OUT') {
      return NextResponse.json({ ok: false, code: 'ONLY_OUT_UNDO' }, { status: 400 });
    }

    const age = Date.now() - new Date(scan.scannedAt).getTime();
    if (age > UNDO_WINDOW_MS) {
      return NextResponse.json({ ok: false, code: 'UNDO_EXPIRED', ageMs: age }, { status: 400 });
    }

    // Delete the scan
    await prisma.scan.delete({ where: { id: scan.id } });
    await prisma.eventLog.create({ data: { type: 'SCAN_UNDO', message: scan.id, metadata: JSON.stringify({ byUser: u.userId, personId: scan.personId }) } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
