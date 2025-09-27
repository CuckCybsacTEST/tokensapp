import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { isBirthdaysEnabledPublic } from '@/lib/featureFlags';
import { apiError, apiOk } from '@/lib/apiError';
import { redeemToken } from '@/lib/birthdays/service';

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
      // Mensaje diferenciado: si es el token del cumpleañero no hablamos en segunda persona "estás invitado".
      let publicMessage: string;
      if (token.kind === 'host') {
        publicMessage = `Esta es la fiesta de ${firstName}. Presenta este código para tu acceso como cumpleañer@ y disfruta tu noche.`;
      } else {
        publicMessage = `Estás invitad@ a la fiesta de ${firstName}. Muestra este código al ingresar y prepárate para celebrar.`;
      }
      return apiOk({
        public: true,
        message: publicMessage,
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

/*
  POST /api/birthdays/invite/:code
  Staff/Admin only: validates (redeems) a token usage.
  Body (JSON optional): { device?: string, location?: string }
  Behaviors:
    - host token: if first validation, sets hostArrivedAt on reservation; subsequent attempts are idempotent (no error) and do not duplicate arrival.
    - guest multi-use token: increments usedCount via service redeem logic until exhausted (saturating at maxUses).
    - returns updated token info + arrival counters (guestArrivals, hostArrivedAt)
*/
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const raw = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(raw);
  const auth = requireRole(session, ['ADMIN','STAFF']);
  if (!auth.ok) return apiError(auth.error || 'UNAUTHORIZED', 'Solo STAFF/ADMIN', undefined, auth.error === 'UNAUTHORIZED' ? 401 : 403);
  const code = params.code;
  let body: any = {};
  try { const txt = await req.text(); body = txt ? JSON.parse(txt) : {}; } catch { return apiError('INVALID_JSON','JSON inválido',undefined,400); }
  try {
    // Fetch existing token + reservation to know kind before redeem
  const tokenPre = await prisma.inviteToken.findUnique({ where: { code }, include: { reservation: true } });
    if (!tokenPre) return apiError('NOT_FOUND','Token no encontrado',undefined,404);
    const resId = tokenPre.reservationId;
    // Redeem (multi-use aware)
    let redeemedResult = null as any;
    if (tokenPre.kind === 'host') {
      // Host token should be single-use logically; allow idempotent re-validation
      if (tokenPre.status === 'redeemed' || tokenPre.status === 'exhausted') {
        // ensure hostArrivedAt exists; if not, set it
        if (!((tokenPre as any).reservation as any).hostArrivedAt) {
          await prisma.birthdayReservation.update({ where: { id: resId }, data: ({ hostArrivedAt: new Date() } as any) });
        }
        const reservation = await prisma.birthdayReservation.findUnique({ where: { id: resId } });
        return apiOk({
          idempotent: true,
          token: { code: tokenPre.code, kind: tokenPre.kind, status: tokenPre.status, usedCount: (tokenPre as any).usedCount, maxUses: (tokenPre as any).maxUses },
          arrival: { hostArrivedAt: (reservation as any)?.hostArrivedAt || null, guestArrivals: (reservation as any)?.guestArrivals ?? 0 }
        });
      }
      redeemedResult = await redeemToken(code, { by: (session as any)?.id, device: body.device, location: body.location }, (session as any)?.id);
      // Set hostArrivedAt if not set
      await prisma.birthdayReservation.update({ where: { id: resId }, data: ({ hostArrivedAt: new Date() } as any) });
    } else {
      // guest token (multi-use): redeem increments usedCount; we also update cached guestArrivals to usedCount
      redeemedResult = await redeemToken(code, { by: (session as any)?.id, device: body.device, location: body.location }, (session as any)?.id);
      // After redeem, sync guestArrivals = usedCount for reservation (host arrivals unaffected)
      const tok = redeemedResult.token as any;
      await prisma.birthdayReservation.update({ where: { id: resId }, data: ({ guestArrivals: tok.usedCount || 0 } as any) });
    }
    const reservation = await prisma.birthdayReservation.findUnique({ where: { id: resId } });
    return apiOk({
      token: {
        code: redeemedResult.token.code,
        kind: redeemedResult.token.kind,
        status: redeemedResult.token.status,
        usedCount: (redeemedResult.token as any).usedCount,
        maxUses: (redeemedResult.token as any).maxUses,
      },
      arrival: { hostArrivedAt: (reservation as any)?.hostArrivedAt || null, guestArrivals: (reservation as any)?.guestArrivals ?? 0 }
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg === 'TOKEN_EXHAUSTED') return apiError('TOKEN_EXHAUSTED','Token agotado');
    if (msg === 'TOKEN_ALREADY_REDEEMED') return apiError('TOKEN_ALREADY_REDEEMED','Token ya usado');
    if (msg === 'TOKEN_EXPIRED') return apiError('TOKEN_EXPIRED','Token expirado');
    if (msg === 'INVALID_SIGNATURE') return apiError('INVALID_SIGNATURE','Firma inválida');
    return apiError('INTERNAL','Error interno');
  }
}
