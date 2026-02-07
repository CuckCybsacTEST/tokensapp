import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import {
  getEvent,
  updateEvent,
  cancelEvent,
  completeEvent,
  activateEvent,
  getEventStats,
} from '@/lib/invitations/service';

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF', 'COLLAB'].includes(session.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const event = await getEvent(params.eventId);
    if (!event) return apiError('NOT_FOUND', 'Event not found', undefined, 404);

    const stats = await getEventStats(params.eventId);
    return apiOk({ ...event, stats });
  } catch (e: any) {
    return apiError('INTERNAL_ERROR', String(e?.message || e), undefined, 500);
  }
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeSlot: z.string().min(1).max(20).optional(),
  location: z.string().max(200).optional(),
  maxGuests: z.number().int().min(1).max(5000).optional(),
  templateUrl: z.string().url().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF'].includes(session.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const body = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400);

    const data: any = { ...parsed.data };
    if (data.date) {
      data.date = new Date(data.date + 'T00:00:00-05:00');
    }

    const updated = await updateEvent(params.eventId, data);
    return apiOk({ ok: true, event: updated });
  } catch (e: any) {
    return apiError('UPDATE_EVENT_ERROR', String(e?.message || e), undefined, 500);
  }
}
