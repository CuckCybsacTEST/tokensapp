import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

async function fixReservationDates() {
  console.log('Corrigiendo fechas de reservas que están en formato incorrecto...');

  // Obtener todas las reservas
  const reservations = await prisma.birthdayReservation.findMany({
    select: { id: true, date: true, createdAt: true }
  });

  console.log(`Encontradas ${reservations.length} reservas`);

  for (const reservation of reservations) {
    try {
      // Verificar si la fecha está en el formato incorrecto
      // Si la hora UTC es 00:00:00, probablemente está mal
      const date = reservation.date;
      if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
        // Esta fecha probablemente está mal. Debería ser 05:00:00 UTC para medianoche Lima
        const correctedDate = new Date(date);
        correctedDate.setUTCHours(5, 0, 0, 0);

        console.log(`Corrigiendo reserva ${reservation.id}:`);
        console.log(`  Fecha actual: ${date.toISOString()}`);
        console.log(`  Fecha corregida: ${correctedDate.toISOString()}`);

        // Verificar que la fecha corregida tenga sentido
        const limaDate = DateTime.fromJSDate(correctedDate).setZone('America/Lima');
        console.log(`  Fecha en Lima: ${limaDate.toFormat('yyyy-MM-dd HH:mm:ss')}`);

        await prisma.birthdayReservation.update({
          where: { id: reservation.id },
          data: { date: correctedDate }
        });

        console.log(`  ✅ Actualizada`);
      }
    } catch (error) {
      console.error(`Error corrigiendo reserva ${reservation.id}:`, error);
    }
  }

  console.log('Corrección de fechas completada');
  await prisma.$disconnect();
}

fixReservationDates().catch(console.error);
