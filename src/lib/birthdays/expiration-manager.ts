import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

// Función para asegurar que los tokens (guest) tengan la expiración correcta:
// 23:59:59 del día de la reserva en zona Lima.
// (Los tokens de tipo 'host' ya no existen - sistema unificado a token único 'guest')
export async function ensureCorrectTokenExpirations(reservationId: string) {
  const reservation = await prisma.birthdayReservation.findUnique({
    where: { id: reservationId },
    include: { inviteTokens: true }
  });

  if (!reservation) {
    throw new Error('RESERVATION_NOT_FOUND');
  }

  // Calcular expiración: 23:59:59 del día de la reserva en zona Lima
  const reservationDateLima = DateTime.fromJSDate(reservation.date).setZone('America/Lima');
  const guestExpirationDateTime = reservationDateLima.set({ hour: 23, minute: 59, second: 59, millisecond: 999 });
  const guestExpiration = guestExpirationDateTime.toJSDate();

  console.log(`[BIRTHDAYS] Ensuring correct expirations for reservation ${reservationId}:`, {
    guestExpiration,
    tokenCount: reservation.inviteTokens.length
  });

  // Actualizar todos los tokens (solo existe kind='guest' ahora)
  await prisma.inviteToken.updateMany({
    where: { reservationId },
    data: { expiresAt: guestExpiration }
  });

  return {
    guestExpiration,
    tokensUpdated: reservation.inviteTokens.length
  };
}
