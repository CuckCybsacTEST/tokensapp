import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { addGuest, bulkAddGuests, listGuests, updateGuest, removeGuest } from '@/lib/invitations/service';

const AddGuestSchema = z.object({
  guestName: z.string().min(1).max(200),
  guestPhone: z.string().max(40).optional(),
  guestWhatsapp: z.string().max(40).optional(),
  guestEmail: z.string().email().max(200).optional(),
  guestDni: z.string().max(40).optional(),
  guestCategory: z.enum(['normal', 'influencer', 'vip']).optional(),
  courtesyNote: z.string().max(500).optional(),
  additionalNote: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

const BulkSchema = z.object({
  guests: z.array(AddGuestSchema).min(1).max(500),
});

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF', 'COLLAB'].includes(session.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const guests = await listGuests(params.eventId);
    return apiOk({ guests });
  } catch (e: any) {
    return apiError('INTERNAL_ERROR', String(e?.message || e), undefined, 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF'].includes(session.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const body = await req.json().catch(() => ({}));

    // Support both single guest and bulk
    if (body.guests && Array.isArray(body.guests)) {
      const parsed = BulkSchema.safeParse(body);
      if (!parsed.success) return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400);
      const results = await bulkAddGuests(params.eventId, parsed.data.guests);
      return apiOk({ ok: true, guests: results, count: results.length }, 201);
    }

    const parsed = AddGuestSchema.safeParse(body);
    if (!parsed.success) return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400);

    const guest = await addGuest(params.eventId, parsed.data);
    return apiOk({ ok: true, guest }, 201);
  } catch (e: any) {
    return apiError('ADD_GUEST_ERROR', String(e?.message || e), undefined, 500);
  }
}
