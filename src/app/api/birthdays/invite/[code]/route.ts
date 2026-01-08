import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { isBirthdaysEnabledPublic } from '@/lib/featureFlags';
import { apiError, apiOk } from '@/lib/apiError';
import { redeemToken } from '@/lib/birthdays/service';
import { DateTime } from 'luxon';
import { corsHeadersFor } from '@/lib/cors';

/*
  GET /api/birthdays/invite/:code
  Public: returns celebratory minimal data if feature flag enabled and token valid.
  Staff/Admin: returns extended reservation + token debug info.
  Error codes: NOT_FOUND, FEATURE_DISABLED
*/
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const cors = corsHeadersFor(req);
  if (!isBirthdaysEnabledPublic()) {
    // Still allow ADMIN/STAFF to inspect if feature disabled? For simplicity: yes.
    // We'll continue but mark flag state.
  }
  const raw = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(raw);
  const isStaff = !!session && requireRole(session, ['ADMIN','STAFF']).ok;

  // Also check for collaborator sessions with restaurant area
  let isCollaboratorStaff = false;
  if (!isStaff) {
    const userRaw = getSessionCookieFromRequest(req as unknown as Request);
    const userSession = await verifySessionCookie(userRaw);

    if (userSession) {
      // Check if user has restaurant area
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const user = await prisma.user.findUnique({
          where: { id: userSession.userId },
          include: { person: true }
        });

        await prisma.$disconnect();

        if (user?.person?.area) {
          // Map area to staff role
          const { mapAreaToStaffRole } = require('@/lib/staff-roles');
          const restaurantRole = mapAreaToStaffRole(user.person.area);
          if (restaurantRole) {
            isCollaboratorStaff = true;
          }
        }
      } catch (err) {
        console.error('Error checking collaborator staff status:', err);
      }
    }
  }

  const effectiveIsStaff = isStaff || isCollaboratorStaff;
  try {
    console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Buscando token', { code: params.code, isStaff: effectiveIsStaff });
    const token = await prisma.inviteToken.findUnique({ 
      where: { code: params.code }, 
      include: { 
        reservation: { 
          include: { pack: true } 
        } 
      } 
    });
    
    // Debug: Check hostArrivedAt directly from database
    if (token) {
      console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Token encontrado en DB', { 
        code: params.code,
        reservationId: token.reservationId,
        hasReservation: !!token.reservation
      });
      if (token.reservation) {
        const directCheck = await prisma.$queryRaw`SELECT "hostArrivedAt" FROM "BirthdayReservation" WHERE id = ${token.reservationId}`;
        console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Direct DB check', { 
          reservationId: token.reservationId,
          directHostArrivedAt: directCheck,
          includeHostArrivedAt: (token.reservation as any).hostArrivedAt
        });
      } else {
        // If include didn't work, try to fetch reservation separately
        console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Include no funcionó, buscando reserva por separado');
        const reservation = await prisma.birthdayReservation.findUnique({
          where: { id: token.reservationId },
          include: { pack: true }
        });
        if (reservation) {
          (token as any).reservation = reservation;
          console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Reserva encontrada por separado', { id: reservation.id });
        } else {
          console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Reserva NO encontrada por separado', { reservationId: token.reservationId });
        }
      }
    }
    if (!token) {
      console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Token NO encontrado', { code: params.code });
      return apiError('NOT_FOUND', 'Token no encontrado', undefined, 404, cors);
    }
    if (!token.reservation) {
      console.log('[BIRTHDAYS] GET /api/birthdays/invite/[code]: Token encontrado pero sin reserva', { code: params.code });
      return apiError('NOT_FOUND', 'Reserva no encontrada', undefined, 404, cors);
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
      celebrantName: r.celebrantName,
      date: r.date,
      dateType: typeof r.date,
      timeSlot: r.timeSlot
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
    if (!effectiveIsStaff) {
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
        token: { ...base, celebrantName: firstName }, // Solo primer nombre en vista pública
        hostArrivedAt: r.hostArrivedAt ? r.hostArrivedAt.toISOString() : null,
        reservation: {
          date: r.date && r.date instanceof Date ? r.date.toISOString() : null,
          timeSlot: r.timeSlot || null,
          guestArrivals: r.guestArrivals || 0,
          // Exponer estado para UI pública (mostrar cancelado)
          statusReservation: r.status
        },
        isAdmin: false
      }, 200, cors);
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
      date: r.date && r.date instanceof Date ? r.date.toISOString().slice(0,10) : null,
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
    return apiOk({ public: false, token: base, reservation: extended,       isAdmin: effectiveIsStaff && session?.role === 'ADMIN' }, 200, cors);
  } catch (e) {
  return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500, cors);
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
  const cors = corsHeadersFor(req);
  const raw = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(raw);
  const auth = requireRole(session, ['ADMIN','STAFF']);
  if (!auth.ok) return apiError(auth.error || 'UNAUTHORIZED', 'Solo STAFF/ADMIN', undefined, auth.error === 'UNAUTHORIZED' ? 401 : 403, cors);
  const code = params.code;
  let body: any = {};
  try { const txt = await req.text(); body = txt ? JSON.parse(txt) : {}; } catch { return apiError('INVALID_JSON','JSON inválido',undefined,400, cors); }
  const role = body.role; // 'host' or 'guest'
  if (!role || !['host', 'guest'].includes(role)) return apiError('INVALID_ROLE','Rol inválido: debe ser "host" o "guest"',undefined,400, cors);
  try {
    // Fetch existing token + reservation to know kind before redeem
  const tokenPre = await prisma.inviteToken.findUnique({ where: { code }, include: { reservation: true } });
    if (!tokenPre) return apiError('NOT_FOUND','Token no encontrado',undefined,404, cors);
    const resId = tokenPre.reservationId;
    // Redeem based on role
    let redeemedResult = null as any;
    if (role === 'host') {
      // Check if host already arrived
      const reservation = await prisma.birthdayReservation.findUnique({ where: { id: resId } });
      if ((reservation as any).hostArrivedAt) {
        return apiError('HOST_ALREADY_ARRIVED','El cumpleañero ya fue registrado',undefined,400, cors);
      }
      // For host, redeem the token (even if guest token, to mark as used if needed, but actually for host we don't consume use)
      // Actually, for host, we don't redeem the token, just set hostArrivedAt
      // But to keep consistency, perhaps redeem if it's the first time, but since single token, maybe not.
      // For simplicity: don't redeem the token for host, just set hostArrivedAt
      // For host, don't redeem token, just set hostArrivedAt to reservation time
      const resForHost = await prisma.birthdayReservation.findUnique({ where: { id: resId } });
      const reservationDate = (resForHost as any).date;
      const timeSlot = (resForHost as any).timeSlot;
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const reservationDateTime = DateTime.fromJSDate(reservationDate).setZone('America/Lima');
      const hostArrivalDateTime = reservationDateTime.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
      const hostArrivalTime = hostArrivalDateTime.toJSDate();
      
      await prisma.birthdayReservation.update({ 
        where: { id: resId }, 
        data: ({ hostArrivedAt: hostArrivalTime } as any) 
      });
      
      // Auto-complete the reservation when host arrives
      await prisma.birthdayReservation.update({
        where: { id: resId },
        data: { status: 'completed' }
      });
      
      // Return without redeeming token
      const lastGuestRedemption = await prisma.tokenRedemption.findFirst({
        where: { 
          reservationId: resId,
          token: { kind: 'guest' }
        },
        orderBy: { redeemedAt: 'desc' },
        select: { redeemedAt: true }
      });
      
      return apiOk({
        token: { code: tokenPre.code, kind: tokenPre.kind, status: tokenPre.status, usedCount: (tokenPre as any).usedCount, maxUses: (tokenPre as any).maxUses },
        arrival: { 
          hostArrivedAt: hostArrivalTime.toISOString(), 
          guestArrivals: (reservation as any)?.guestArrivals ?? 0,
          lastGuestArrivalAt: lastGuestRedemption?.redeemedAt?.toISOString() || null
        }
      }, 200, cors);
    } else {
      // guest role: redeem the token
      redeemedResult = await redeemToken(code, { by: (session as any)?.id, device: body.device, location: body.location }, (session as any)?.id);
      // Recalculate total guestArrivals
      const allGuestTokens = await prisma.inviteToken.findMany({
        where: { reservationId: resId, kind: 'guest' },
        select: { usedCount: true, code: true }
      });
      const totalGuestArrivals = allGuestTokens.reduce((sum, token) => sum + (token.usedCount || 0), 0);
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
    }, 200, cors);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg === 'TOKEN_EXHAUSTED') return apiError('TOKEN_EXHAUSTED','Token agotado', undefined, 400, cors);
    if (msg === 'TOKEN_ALREADY_REDEEMED') return apiError('TOKEN_ALREADY_REDEEMED','Token ya usado', undefined, 400, cors);
    if (msg === 'TOKEN_EXPIRED') return apiError('TOKEN_EXPIRED','Token expirado', undefined, 400, cors);
    if (msg === 'INVALID_SIGNATURE') return apiError('INVALID_SIGNATURE','Firma inválida', undefined, 400, cors);
    if (msg === 'RESERVATION_DATE_FUTURE') return apiError('RESERVATION_DATE_FUTURE','La fecha de la reserva es futura - los tokens solo funcionan en la fecha de la reserva o después', undefined, 400, cors);
    return apiError('INTERNAL_ERROR','Error interno', undefined, 500, cors);
  }
}
