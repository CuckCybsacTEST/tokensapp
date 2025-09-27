import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

/*
  GET /api/admin/birthdays/health
  Returns diagnostic information to debug DB schema mismatches in production.
  Only ADMIN/STAFF.
*/
export async function GET(req: NextRequest) {
  const raw = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(raw);
  const authz = requireRole(session, ['ADMIN','STAFF']);
  if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);

  const diagnostics: any = { ok: true, checks: {} };
  // 1. Columns existence check for recent additions
  try {
    await prisma.$queryRawUnsafe('SELECT "hostArrivedAt", "guestArrivals" FROM "BirthdayReservation" LIMIT 1');
    diagnostics.checks.columns = { hostArrivedAt: true, guestArrivals: true };
  } catch (e: any) {
    diagnostics.ok = false;
    diagnostics.checks.columns = { hostArrivedAt: false, guestArrivals: false, error: String(e?.message || e) };
  }

  // 2. Count reservations by status (ignore if table missing)
  try {
    const rows: Array<{ status: string; count: bigint | number }> = await prisma.$queryRawUnsafe('SELECT status, COUNT(*)::bigint AS count FROM "BirthdayReservation" GROUP BY status');
    diagnostics.reservationCounts = rows.map(r => ({ status: r.status, count: Number(r.count) }));
  } catch (e: any) {
    diagnostics.reservationCounts = { error: String(e?.message || e) };
  }

  // 3. Packs present?
  try {
    const packs = await prisma.birthdayPack.findMany({ select: { id: true, name: true, active: true, qrCount: true }, take: 10 });
    diagnostics.packs = { totalSample: packs.length, sample: packs };
  } catch (e: any) {
    diagnostics.packs = { error: String(e?.message || e) };
  }

  // 4. Applied migrations (if Prisma migrations table exists)
  try {
    const migs: Array<{ id: string; migration_name: string; finished_at: Date | null }> = await prisma.$queryRawUnsafe('SELECT id, migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC NULLS LAST, migration_name DESC LIMIT 15');
    diagnostics.migrations = migs.map(m => ({ id: m.id, name: m.migration_name, finishedAt: m.finished_at }));
  } catch (e: any) {
    diagnostics.migrations = { error: String(e?.message || e) };
  }

  return apiOk(diagnostics);
}
