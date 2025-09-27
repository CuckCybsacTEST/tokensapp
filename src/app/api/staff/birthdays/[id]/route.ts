import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import { getReservation } from '@/lib/birthdays/service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const raw = getUserSessionCookieFromRequest(req as unknown as Request);
  const session = await verifyUserSessionCookie(raw);
  if (!session || session.role !== 'STAFF') return apiError('UNAUTHORIZED', undefined, undefined, 401);
  const r = await getReservation(params.id);
  if (!r) return apiError('NOT_FOUND', 'Reservation not found', undefined, 404);
  const dto = {
    id: r.id,
    celebrantName: r.celebrantName,
    phone: r.phone,
    documento: r.documento,
    email: r.email ?? null,
    date: r.date.toISOString().slice(0,10),
    timeSlot: r.timeSlot,
    pack: r.pack ? { id: r.pack.id, name: r.pack.name, qrCount: r.pack.qrCount, bottle: r.pack.bottle, perks: r.pack.perks } : null,
    guestsPlanned: r.guestsPlanned,
    status: r.status,
    tokensGeneratedAt: r.tokensGeneratedAt ? r.tokensGeneratedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    courtesyItems: r.courtesyItems || [],
    photoDeliveries: r.photoDeliveries || [],
  };
  return apiOk(dto);
}
