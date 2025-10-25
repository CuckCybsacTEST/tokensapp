import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

async function fixTokenExpirations() {
  console.log('Corrigiendo expiraciones de tokens sin hostArrivedAt...');

  // Obtener todas las reservas que tienen tokens pero no tienen hostArrivedAt
  const reservations = await prisma.birthdayReservation.findMany({
    where: {
      tokensGeneratedAt: { not: null },
      hostArrivedAt: null // Solo las que no tienen llegada del host
    },
    include: {
      inviteTokens: true
    }
  });

  console.log(`Encontradas ${reservations.length} reservas sin hostArrivedAt`);

  for (const reservation of reservations) {
    try {
      console.log(`Corrigiendo expiración para reserva ${reservation.id} (fecha: ${reservation.date.toISOString()})`);

      // Calcular la expiración correcta: endOf('day') de la fecha de reserva
      const reservationDateLima = DateTime.fromJSDate(reservation.date).setZone('America/Lima');
      const correctExpiration = reservationDateLima.endOf('day').toJSDate();

      console.log(`  Nueva expiración: ${correctExpiration.toISOString()}`);

      // Actualizar todos los tokens de esta reserva
      const updateResult = await prisma.inviteToken.updateMany({
        where: { reservationId: reservation.id },
        data: { expiresAt: correctExpiration }
      });

      console.log(`  Actualizados ${updateResult.count} tokens`);
    } catch (error) {
      console.error(`Error corrigiendo reserva ${reservation.id}:`, error);
    }
  }

  console.log('Corrección completada');
  await prisma.$disconnect();
}

fixTokenExpirations().catch(console.error);