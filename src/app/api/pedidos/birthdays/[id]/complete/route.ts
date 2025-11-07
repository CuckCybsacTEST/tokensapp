import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { completeReservation } from '@/lib/birthdays/service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const raw = getUserSessionCookieFromRequest(req as unknown as Request);
  const session = await verifyUserSessionCookie(raw);
  if (!session || session.role !== 'STAFF') return apiError('UNAUTHORIZED', undefined, undefined, 401);
  const r = await completeReservation(params.id, session.userId);
  return apiOk(r);
}
