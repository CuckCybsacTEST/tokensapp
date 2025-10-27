import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { isBirthdaysEnabledPublic } from '@/lib/featureFlags';
import { apiError, apiOk } from '@/lib/apiError';
import { redeemToken } from '@/lib/birthdays/service';
import { DateTime } from 'luxon';

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
    console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Buscando token', { code: params.code, isStaff });
    const token = await prisma.inviteToken.findUnique({ where: { code: params.code }, include: { reservation: { include: { pack: true } } } });
    
    // Debug: Check hostArrivedAt directly from database
    if (token) {
      const directCheck = await prisma.$queryRaw`SELECT "hostArrivedAt" FROM "BirthdayReservation" WHERE id = ${token.reservationId}`;
      console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Direct DB check', { 
        reservationId: token.reservationId,
        directHostArrivedAt: directCheck,
        includeHostArrivedAt: (token.reservation as any).hostArrivedAt
      });
    }
    if (!token) {
      console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Token NO encontrado', { code: params.code });
      return apiError('NOT_FOUND', 'Token no encontrado', undefined, 404);
    }
    console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Token encontrado', {
      code: params.code,
      kind: token.kind,
      status: token.status,
      reservationId: token.reservationId,
      expiresAt: token.expiresAt
    });
    const r = token.reservation as any;
    console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Reservation data', {
      reservationId: r.id,
      hostArrivedAt: r.hostArrivedAt,
      hostArrivedAtType: typeof r.hostArrivedAt,
      celebrantName: r.celebrantName
    });
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
        hostArrivedAt: r.hostArrivedAt ? r.hostArrivedAt.toISOString() : null,
        reservation: {
          date: r.date ? r.date.toISOString() : null,
          timeSlot: r.timeSlot || null,
          guestArrivals: r.guestArrivals || 0
        }
      });
    }
    // Staff/Admin extended fields
    // Get last guest arrival time
    const lastGuestRedemption = await prisma.tokenRedemption.findFirst({
      where: { 
        reservationId: r.id,
        token: { kind: 'guest' }
      },
      orderBy: { redeemedAt: 'desc' },
      select: { redeemedAt: true }
    });
    
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
      hostArrivedAt: r.hostArrivedAt ? r.hostArrivedAt.toISOString() : null,
      guestArrivals: r.guestArrivals || 0,
      lastGuestArrivalAt: lastGuestRedemption?.redeemedAt?.toISOString() || null,
    };
    return apiOk({ public: false, token: base, reservation: extended });
  } catch (e) {
  return apiError('INTERNAL_ERROR', 'Error interno');
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
        // Token already redeemed/exhausted - don't update hostArrivedAt, just ensure it's set
        console.log('[BIRTHDAYS] POST /api/birthdays/invite/[code]: Token already redeemed/exhausted, checking hostArrivedAt', { 
          resId, 
          currentHostArrivedAt: ((tokenPre as any).reservation as any).hostArrivedAt 
        });
        
        // If hostArrivedAt is not set (shouldn't happen but safety check), set it to reservation time
        if (!((tokenPre as any).reservation as any).hostArrivedAt) {
          const reservation = await prisma.birthdayReservation.findUnique({ where: { id: resId } });
          const reservationDate = (reservation as any).date;
          const timeSlot = (reservation as any).timeSlot;
          const [hours, minutes] = timeSlot.split(':').map(Number);
          // Use Luxon for proper timezone handling
          const reservationDateTime = DateTime.fromJSDate(reservationDate).setZone('America/Lima');
          const hostArrivalDateTime = reservationDateTime.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
          const hostArrivalTime = hostArrivalDateTime.toJSDate();
          
          console.log('[BIRTHDAYS] POST /api/birthdays/invite/[code]: Setting missing hostArrivedAt to reservation time', { resId, hostArrivalTime: hostArrivalTime.toISOString() });
          await prisma.birthdayReservation.update({ 
            where: { id: resId }, 
            data: ({ hostArrivedAt: hostArrivalTime } as any) 
          });
        }
        
        // REMOVED: No longer recalculate expirations when host arrives - expiration is fixed to reservation_time + 45min
        
        // Get last guest arrival time for response
        const lastGuestRedemption = await prisma.tokenRedemption.findFirst({
          where: { 
            reservationId: resId,
            token: { kind: 'guest' }
          },
          orderBy: { redeemedAt: 'desc' },
          select: { redeemedAt: true }
        });
        
        const reservation = await prisma.birthdayReservation.findUnique({ where: { id: resId } });
        return apiOk({
          idempotent: true,
          token: { code: tokenPre.code, kind: tokenPre.kind, status: tokenPre.status, usedCount: (tokenPre as any).usedCount, maxUses: (tokenPre as any).maxUses },
          arrival: { 
            hostArrivedAt: (reservation as any)?.hostArrivedAt || null, 
            guestArrivals: (reservation as any)?.guestArrivals ?? 0,
            lastGuestArrivalAt: lastGuestRedemption?.redeemedAt?.toISOString() || null
          }
        });
      }
      redeemedResult = await redeemToken(code, { by: (session as any)?.id, device: body.device, location: body.location }, (session as any)?.id);
      // Set hostArrivedAt to reservation time (not current time)
      const reservation = await prisma.birthdayReservation.findUnique({ where: { id: resId } });
      const reservationDate = (reservation as any).date;
      const timeSlot = (reservation as any).timeSlot; // e.g., "20:00"
      
      // Parse timeSlot and combine with reservation date using Luxon for proper timezone handling
      const [hours, minutes] = timeSlot.split(':').map(Number);
      // Interpretar reservationDate como fecha en zona Lima y agregar la hora del timeSlot
      const reservationDateTime = DateTime.fromJSDate(reservationDate).setZone('America/Lima');
      const hostArrivalDateTime = reservationDateTime.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
      const hostArrivalTime = hostArrivalDateTime.toJSDate();
      
      console.log('[BIRTHDAYS] POST /api/birthdays/invite/[code]: Setting hostArrivedAt to reservation time', { 
        resId, 
        reservationDate: reservationDate.toISOString(),
        timeSlot,
        hostArrivalDateTime: hostArrivalDateTime.toISO(),
        hostArrivalTime: hostArrivalTime.toISOString()
      });
      
      const firstUpdateResult = await prisma.birthdayReservation.update({ 
        where: { id: resId }, 
        data: ({ hostArrivedAt: hostArrivalTime } as any) 
      });
      console.log('[BIRTHDAYS] POST /api/birthdays/invite/[code]: First update result', { firstUpdateResult });
      
      // REMOVED: No longer recalculate expirations when host arrives - expiration is fixed to reservation_time + 45min
    } else {
      // guest token: redeem the token when staff validates it (this represents guest arrival)
      console.log('[BIRTHDAYS] POST /api/birthdays/invite/[code]: Redeeming guest token');
      redeemedResult = await redeemToken(code, { by: (session as any)?.id, device: body.device, location: body.location }, (session as any)?.id);
      // After redeem, recalculate total guestArrivals = sum of usedCount for all guest tokens in this reservation
      const allGuestTokens = await prisma.inviteToken.findMany({
        where: { reservationId: resId, kind: 'guest' },
        select: { usedCount: true, code: true }
      });
      const totalGuestArrivals = allGuestTokens.reduce((sum, token) => sum + (token.usedCount || 0), 0);
      console.log('[BIRTHDAYS] POST /api/birthdays/invite/[code]: Recalculating guestArrivals after redeem', {
        resId,
        guestTokensCount: allGuestTokens.length,
        guestTokens: allGuestTokens.map(t => ({ code: t.code, usedCount: t.usedCount })),
        totalGuestArrivals
      });
      await prisma.birthdayReservation.update({ where: { id: resId }, data: ({ guestArrivals: totalGuestArrivals } as any) });
    }
    
    // Get updated last guest arrival time after redemption
    const lastGuestRedemption = await prisma.tokenRedemption.findFirst({
      where: { 
        reservationId: resId,
        token: { kind: 'guest' }
      },
      orderBy: { redeemedAt: 'desc' },
      select: { redeemedAt: true }
    });
    
    const reservation = await prisma.birthdayReservation.findUnique({ where: { id: resId } });
    return apiOk({
      token: {
        code: redeemedResult.token.code,
        kind: redeemedResult.token.kind,
        status: redeemedResult.token.status,
        usedCount: (redeemedResult.token as any).usedCount,
        maxUses: (redeemedResult.token as any).maxUses,
      },
      arrival: { 
        hostArrivedAt: (reservation as any)?.hostArrivedAt || null, 
        guestArrivals: (reservation as any)?.guestArrivals ?? 0,
        lastGuestArrivalAt: lastGuestRedemption?.redeemedAt?.toISOString() || null
      }
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg === 'TOKEN_EXHAUSTED') return apiError('TOKEN_EXHAUSTED','Token agotado');
    if (msg === 'TOKEN_ALREADY_REDEEMED') return apiError('TOKEN_ALREADY_REDEEMED','Token ya usado');
    if (msg === 'TOKEN_EXPIRED') return apiError('TOKEN_EXPIRED','Token expirado');
    if (msg === 'INVALID_SIGNATURE') return apiError('INVALID_SIGNATURE','Firma inválida');
    if (msg === 'RESERVATION_DATE_FUTURE') return apiError('RESERVATION_DATE_FUTURE','La fecha de la reserva es futura - los tokens solo funcionan en la fecha de la reserva o después');
    return apiError('INTERNAL_ERROR','Error interno');
  }
}
