import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

// Función para recalcular expiraciones de tokens basado en hostArrivedAt
export async function recalculateTokenExpirations(reservationId: string) {
  const reservation = await prisma.birthdayReservation.findUnique({
    where: { id: reservationId },
    include: { inviteTokens: true }
  });

  if (!reservation) {
    throw new Error('RESERVATION_NOT_FOUND');
  }

  if (!reservation.hostArrivedAt) {
    // Si no hay llegada registrada, no hacer nada
    return;
  }

  // Calcular nueva expiración: 45 minutos después de la llegada del host
  const hostArrivalDateTime = DateTime.fromJSDate(reservation.hostArrivedAt).setZone('America/Lima');
  const newExpirationDateTime = hostArrivalDateTime.plus({ minutes: 45 });
  const newExpiration = newExpirationDateTime.toJSDate();

  console.log(`[BIRTHDAYS] Recalculating expirations for reservation ${reservationId}:`, {
    hostArrivedAt: reservation.hostArrivedAt,
    newExpiration,
    tokenCount: reservation.inviteTokens.length
  });

  // Actualizar todos los tokens de la reserva
  await prisma.inviteToken.updateMany({
    where: { reservationId },
    data: { expiresAt: newExpiration }
  });

  return {
    hostArrivedAt: reservation.hostArrivedAt,
    newExpiration,
    tokensUpdated: reservation.inviteTokens.length
  };
}