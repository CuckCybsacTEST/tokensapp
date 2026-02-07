import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { updateGuest, removeGuest } from '@/lib/invitations/service';

const UpdateGuestSchema = z.object({
  guestName: z.string().min(1).max(200).optional(),
  guestPhone: z.string().max(40).optional().nullable(),
  guestWhatsapp: z.string().max(40).optional().nullable(),
  guestEmail: z.string().email().max(200).optional().nullable(),
  guestDni: z.string().max(40).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { eventId: string; guestId: string } }) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF'].includes(session.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const body = await req.json().catch(() => ({}));
    const parsed = UpdateGuestSchema.safeParse(body);
    if (!parsed.success) return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400);

    const { guestPhone, guestWhatsapp, guestEmail, guestDni, notes, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (guestPhone !== undefined) updateData.guestPhone = guestPhone ?? undefined;
    if (guestWhatsapp !== undefined) updateData.guestWhatsapp = guestWhatsapp ?? undefined;
    if (guestEmail !== undefined) updateData.guestEmail = guestEmail ?? undefined;
    if (guestDni !== undefined) updateData.guestDni = guestDni ?? undefined;
    if (notes !== undefined) updateData.notes = notes ?? undefined;
    const guest = await updateGuest(params.guestId, updateData as any);
    return apiOk({ ok: true, guest });
  } catch (e: any) {
    return apiError('UPDATE_GUEST_ERROR', String(e?.message || e), undefined, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { eventId: string; guestId: string } }) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF'].includes(session.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    await removeGuest(params.guestId);
    return apiOk({ ok: true });
  } catch (e: any) {
    return apiError('REMOVE_GUEST_ERROR', String(e?.message || e), undefined, 500);
  }
}
