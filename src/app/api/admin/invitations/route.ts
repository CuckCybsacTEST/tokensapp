import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { listEvents, createEvent, getGlobalInvitationStats } from '@/lib/invitations/service';

const ListSchema = z.object({
  status: z.string().optional(),
  dateFilter: z.enum(['all', 'upcoming', 'past', 'today']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const userSession = await verifyUserSessionCookie(userCookie);
    if (!userSession) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!userSession.role || !['ADMIN', 'STAFF', 'COLLAB'].includes(userSession.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const { searchParams } = new URL(req.url);

    // Global stats request
    if (searchParams.get('stats') === '1') {
      const stats = await getGlobalInvitationStats();
      return apiOk(stats);
    }

    const parsed = ListSchema.safeParse({
      status: searchParams.get('status') || undefined,
      dateFilter: searchParams.get('dateFilter') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });
    if (!parsed.success) return apiError('INVALID_QUERY', 'Invalid query', parsed.error.flatten(), 400);

    const res = await listEvents(parsed.data, { page: parsed.data.page, pageSize: parsed.data.pageSize });
    return apiOk(res);
  } catch (e: any) {
    return apiError('INTERNAL_ERROR', String(e?.message || e), undefined, 500);
  }
}

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().min(1).max(20),
  location: z.string().max(200).optional(),
  maxGuests: z.number().int().min(1).max(5000).optional(),
  templateUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF'].includes(session.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400);

    const { date, ...rest } = parsed.data;
    const dateObj = new Date(date + 'T00:00:00-05:00'); // Lima timezone

    const event = await createEvent({
      ...rest,
      date: dateObj,
      createdBy: session.role,
    });

    return apiOk({ ok: true, event }, 201);
  } catch (e: any) {
    return apiError('CREATE_EVENT_ERROR', String(e?.message || e), undefined, 500);
  }
}
