import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

// Función para asegurar que los tokens tengan la expiración correcta:
// - Host: hora_reserva + 45 minutos
// - Guest: 23:59:59 del día de la reserva
export async function ensureCorrectTokenExpirations(reservationId: string) {
  const reservation = await prisma.birthdayReservation.findUnique({
    where: { id: reservationId },
    include: { inviteTokens: true }
  });

  if (!reservation) {
    throw new Error('RESERVATION_NOT_FOUND');
  }

  // Calcular expiraciones correctas según el tipo de token
  const reservationDateLima = DateTime.fromJSDate(reservation.date).setZone('America/Lima');
  const [hours, minutes] = reservation.timeSlot.split(':').map(Number);
  const reservationDateTime = reservationDateLima.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

  // Host: hora de reserva + 45 minutos
  const hostExpirationDateTime = reservationDateTime.plus({ minutes: 45 });
  const hostExpiration = hostExpirationDateTime.toJSDate();

  // Guest: 23:59:59 del día de la reserva
  const guestExpirationDateTime = reservationDateLima.set({ hour: 23, minute: 59, second: 59, millisecond: 999 });
  const guestExpiration = guestExpirationDateTime.toJSDate();

  console.log(`[BIRTHDAYS] Ensuring correct expirations for reservation ${reservationId}:`, {
    reservationTime: reservationDateTime.toISO(),
    hostExpiration,
    guestExpiration,
    tokenCount: reservation.inviteTokens.length
  });

  // Actualizar tokens de host
  await prisma.inviteToken.updateMany({
    where: { reservationId, kind: 'host' },
    data: { expiresAt: hostExpiration }
  });

  // Actualizar tokens de guest
  await prisma.inviteToken.updateMany({
    where: { reservationId, kind: 'guest' },
    data: { expiresAt: guestExpiration }
  });

  return {
    reservationTime: reservationDateTime.toISO(),
    hostExpiration,
    guestExpiration,
    tokensUpdated: reservation.inviteTokens.length
  };
}