import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { isBirthdaysEnabledPublic } from '@/lib/featureFlags';
import { apiError, apiOk } from '@/lib/apiError';

/*
  GET /api/birthdays/invite/:code
  Public: returns celebratory minimal data if feature flag enabled and token valid.
  Staff/Admin: returns extended reservation + token debug info.
  Error codes: NOT_FOUND, FEATURE_DISABLED
*/
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  if (!isBirthdaysEnabledPublic()) {
    // Still allow ADMIN/STAFF to inspect if feature disabled? For simplicity: yes.
    // We'll continue but mark flag state.
  }
  const raw = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(raw);
  const isStaff = !!session && requireRole(session, ['ADMIN','STAFF']).ok;
  try {
    const token = await prisma.inviteToken.findUnique({ where: { code: params.code }, include: { reservation: { include: { pack: true } } } });
    if (!token) return apiError('NOT_FOUND', 'Token no encontrado', undefined, 404);
    const r = token.reservation as any;
    const firstName = (r.celebrantName || '').trim().split(/\s+/)[0] || r.celebrantName;
    const base = {
      code: token.code,
      kind: token.kind,
      status: token.status,
      expiresAt: token.expiresAt.toISOString(),
      celebrantName: r.celebrantName, // full (staff only) — public response will override with firstName
      packName: r.pack?.name || null,
      packBottle: r.pack?.bottle || null,
      guestsPlanned: r.guestsPlanned,
      isHost: token.kind === 'host',
      multiUse: (token as any).maxUses ? { used: (token as any).usedCount, max: (token as any).maxUses } : null,
      packGuestLimit: (token as any).maxUses || r.pack?.qrCount || null,
    };
    if (!isStaff) {
      return apiOk({
        public: true,
        message: `Bien hecho, estás invitado a la fiesta de ${firstName}! Muestra este código al ingresar y prepárate para ser el protagonista de la noche.`,
        token: { ...base, celebrantName: firstName },
      });
    }
    // Staff/Admin extended fields
    const extended = {
      reservationId: r.id,
      date: r.date.toISOString().slice(0,10),
      timeSlot: r.timeSlot,
      phone: r.phone,
      documento: r.documento,
      email: r.email,
      statusReservation: r.status,
      tokensGeneratedAt: r.tokensGeneratedAt ? r.tokensGeneratedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
    return apiOk({ public: false, token: base, reservation: extended });
  } catch (e) {
    return apiError('INTERNAL', 'Error interno');
  }
}
