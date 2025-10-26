import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

// Función para asegurar que los tokens tengan la expiración correcta: hora_reserva + 45min
export async function ensureCorrectTokenExpirations(reservationId: string) {
  const reservation = await prisma.birthdayReservation.findUnique({
    where: { id: reservationId },
    include: { inviteTokens: true }
  });

  if (!reservation) {
    throw new Error('RESERVATION_NOT_FOUND');
  }

  // Calcular expiración correcta: hora de reserva + 45 minutos (siempre, sin importar llegada del host)
  const reservationDateLima = DateTime.fromJSDate(reservation.date).setZone('America/Lima');
  const [hours, minutes] = reservation.timeSlot.split(':').map(Number);
  const reservationDateTime = reservationDateLima.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  const correctExpirationDateTime = reservationDateTime.plus({ minutes: 45 });
  const correctExpiration = correctExpirationDateTime.toJSDate();

  console.log(`[BIRTHDAYS] Ensuring correct expirations for reservation ${reservationId}:`, {
    reservationTime: reservationDateTime.toISO(),
    correctExpiration,
    tokenCount: reservation.inviteTokens.length
  });

  // Actualizar todos los tokens de la reserva a la expiración correcta
  await prisma.inviteToken.updateMany({
    where: { reservationId },
    data: { expiresAt: correctExpiration }
  });

  return {
    reservationTime: reservationDateTime.toISO(),
    correctExpiration,
    tokensUpdated: reservation.inviteTokens.length
  };
}