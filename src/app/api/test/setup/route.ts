import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

// Dev-only helper to set up test preconditions. Do NOT enable in production.
export async function POST(req: Request) {
  // Only allow in non-production builds
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'NOT_AVAILABLE' }, { status: 404 });
  }

  // Require admin session to avoid misuse even in dev
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN']);
  if (!r.ok) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: any = null;
  try { body = await req.json(); } catch { body = {}; }
  const action = String(body?.action || '');
  if (action !== 'attendance') {
    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });
  }
  const username = String(body?.username || '').trim();
  const mode = String(body?.mode || 'IN').toUpperCase();
  if (!username || (mode !== 'IN' && mode !== 'OUT')) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  // Resolve user and personId
  const esc = (s: string) => s.replace(/'/g, "''");
  const userRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, personId FROM User WHERE username='${esc(username)}' LIMIT 1`
  );
  const user = userRows && userRows[0];
  if (!user || !user.personId) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });

  // Today boundaries (UTC)
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0,0,0,0);
  const nextDay = new Date(dayStart.getTime() + 24*3600*1000);

  // If already has this mode today, return ok idempotently
  const exists: any[] = await prisma.$queryRawUnsafe(
    `SELECT id FROM Scan WHERE personId='${esc(user.personId)}' AND type='${mode}' AND scannedAt >= '${dayStart.toISOString()}' AND scannedAt < '${nextDay.toISOString()}' LIMIT 1`
  );
  if (exists && exists[0]) {
    return NextResponse.json({ ok: true, already: true });
  }

  // Insert scan
  const nowIso = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `INSERT INTO Scan (personId, scannedAt, type, deviceId, byUser, meta, createdAt) VALUES ('${esc(user.personId)}', '${nowIso}', '${mode}', 'test', '${esc(user.id)}', NULL, '${nowIso}')`
  );
  return NextResponse.json({ ok: true });
}
