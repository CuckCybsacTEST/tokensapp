import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { findInvitationByCode, markArrival, getEventStats } from '@/lib/invitations/service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getLastArrival(eventId: string) {
  const lastArrival = await prisma.specialInvitation.findFirst({
    where: { eventId, arrivedAt: { not: null } },
    orderBy: { arrivedAt: 'desc' },
    select: { arrivedAt: true, guestName: true },
  });
  return lastArrival ? {
    arrivedAt: lastArrival.arrivedAt?.toISOString(),
    guestName: lastArrival.guestName,
  } : null;
}

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const inv = await findInvitationByCode(params.code);
    if (!inv) return apiError('NOT_FOUND', 'Invitation not found', undefined, 404);

    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    const isStaff = session?.role && ['ADMIN', 'STAFF', 'COLLAB'].includes(session.role);

    // Public data (always visible)
    const publicData: any = {
      code: inv.code,
      guestName: inv.guestName,
      eventName: inv.event.name,
      eventDate: inv.event.date.toISOString(),
      eventTimeSlot: inv.event.timeSlot,
      eventLocation: inv.event.location,
      status: inv.status,
      arrivedAt: inv.arrivedAt?.toISOString() ?? null,
      isStaff: !!isStaff,
    };

    // Extended data for staff
    if (isStaff) {
      publicData.guestPhone = inv.guestPhone;
      publicData.guestWhatsapp = inv.guestWhatsapp;
      publicData.guestEmail = inv.guestEmail;
      publicData.guestDni = inv.guestDni;
      publicData.notes = inv.notes;
      publicData.expiresAt = inv.expiresAt?.toISOString() ?? null;
      publicData.validatedBy = inv.validatedBy;

      // Add event statistics for staff
      const eventStats = await getEventStats(inv.eventId);
      publicData.eventStats = {
        total: eventStats.total,
        arrived: eventStats.arrived,
        lastArrival: await getLastArrival(inv.eventId),
      };
    }

    return apiOk(publicData);
  } catch (e: any) {
    return apiError('INTERNAL_ERROR', String(e?.message || e), undefined, 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF', 'COLLAB'].includes(session.role))
      return apiError('FORBIDDEN', 'Only staff can validate arrivals', undefined, 403);

    const result = await markArrival(params.code, session.userId || session.role);
    return apiOk({
      ok: true,
      guestName: result.guestName,
      arrivedAt: result.arrivedAt?.toISOString(),
      eventName: result.event.name,
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('INVITATION_NOT_FOUND')) return apiError('NOT_FOUND', 'Invitation not found', undefined, 404);
    if (msg.includes('ALREADY_ARRIVED')) return apiError('ALREADY_ARRIVED', 'Guest already arrived', undefined, 409);
    if (msg.includes('INVITATION_CANCELLED')) return apiError('CANCELLED', 'Invitation is cancelled', undefined, 410);
    return apiError('VALIDATE_ERROR', msg, undefined, 500);
  }
}
