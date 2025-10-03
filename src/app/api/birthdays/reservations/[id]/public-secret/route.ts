import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { isBirthdaysEnabledPublic } from '@/lib/featureFlags';
import { prisma } from '@/lib/prisma';
import { signClientSecret } from '@/lib/birthdays/clientAuth';
import { corsHeadersFor } from '@/lib/cors';

// Emite un clientSecret efímero (duración corta) si la reserva existe y ya tiene tokens generados.
// Uso: /api/birthdays/reservations/:id/public-secret (GET)
// No requiere autenticación; sólo expone un secreto con TTL para ver los QRs.

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cors = corsHeadersFor(req as unknown as Request);
  if (!isBirthdaysEnabledPublic()) return apiError('NOT_FOUND','Not found', undefined, 404, cors);
  try {
    const reservation = await prisma.birthdayReservation.findUnique({ where: { id: params.id } });
    if (!reservation) return apiError('NOT_FOUND','Reserva no encontrada', undefined, 404, cors);
    // Checamos tokens existentes
    const tokens = await prisma.inviteToken.findMany({ where: { reservationId: params.id } });
    if (!tokens.length) return apiError('NO_TOKENS','Aún no hay tokens para la reserva', undefined, 400, cors);
    // Generamos secret con expiración muy corta (ej. 10 minutos)
    const ttlMinutes = 10;
    const exp = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  // Reutilizamos signClientSecret para consistencia (TTL fijo override por exp manual)
  // signClientSecret genera iat/exp internamente; aquí preferimos usar su TTL estándar y obviar exp manual.
  const secret = signClientSecret(params.id, ttlMinutes);
    return apiOk({ clientSecret: secret, ttlMinutes }, 200, cors);
  } catch (e:any) {
    return apiError('INTERNAL_ERROR','Error generando clientSecret', { message: e?.message }, 500, cors);
  }
}

export async function OPTIONS(req: NextRequest) {
  const cors = corsHeadersFor(req as unknown as Request);
  return new Response(null, { status: 204, headers: cors });
}
