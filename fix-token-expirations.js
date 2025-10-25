import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

// Función auxiliar para convertir DateTime a JS Date
function limaDateTimeToJSDate(dt) {
  return dt.toJSDate();
}

// Crear DateTime en zona Lima desde componentes de fecha
function createLimaDateTime(year, month, day) {
  // Crear Date que representa medianoche del día en zona Lima (UTC-5)
  // Para que sea medianoche en Lima, necesitamos 05:00:00 UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
  return DateTime.fromJSDate(utcDate).setZone('America/Lima');
}

// Convertir string YYYY-MM-DD a DateTime en zona Lima (medianoche Lima)
function parseDateStringToLima(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return createLimaDateTime(year, month, day);
}

// Helper para obtener DateTime en zona Lima desde una fecha de reserva
// Las fechas de reserva se almacenan como el inicio del día en Lima
function getReservationDateLima(reservationDate) {
  // La fecha de reserva representa el día calendario en Lima
  // Si está almacenada como Date, extraemos año/mes/día y creamos el DateTime correcto
  const year = reservationDate.getUTCFullYear();
  const month = reservationDate.getUTCMonth() + 1;
  const day = reservationDate.getUTCDate();
  return createLimaDateTime(year, month, day);
}

async function fixInitialTokenExpirations() {
  console.log('Fixing initial token expirations to end of reservation day...');

  // Obtener todas las reservas que tienen tokens generados pero host no ha llegado aún
  const reservations = await prisma.birthdayReservation.findMany({
    where: {
      hostArrivedAt: null, // Host no ha llegado
      tokensGeneratedAt: { not: null } // Tokens ya generados
    },
    include: {
      inviteTokens: true
    }
  });

  console.log(`Found ${reservations.length} reservations to fix`);

  for (const reservation of reservations) {
    const reservationDateLima = getReservationDateLima(reservation.date);
    const newExpirationLima = reservationDateLima.endOf('day');
    const newExpiration = limaDateTimeToJSDate(newExpirationLima);

    console.log(`Updating reservation ${reservation.id} (${reservation.celebrantName}):`);
    console.log(`  Date: ${reservation.date}`);
    console.log(`  Reservation DateTime Lima: ${reservationDateLima.toISO()}`);
    console.log(`  New expiration: ${newExpiration}`);

    // Actualizar todos los tokens de esta reserva
    await prisma.inviteToken.updateMany({
      where: { reservationId: reservation.id },
      data: { expiresAt: newExpiration }
    });

    console.log(`  Updated ${reservation.inviteTokens.length} tokens`);
  }

  console.log('Done!');
}

fixInitialTokenExpirations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());