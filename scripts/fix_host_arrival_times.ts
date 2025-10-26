import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixHostArrivalTimes() {
  console.log('🔧 Corrigiendo hostArrivedAt para usar hora de reserva en lugar de hora actual...');

  // Obtener todas las reservas que tienen hostArrivedAt establecido
  const reservations = await prisma.birthdayReservation.findMany({
    where: {
      hostArrivedAt: { not: null }
    },
    select: {
      id: true,
      date: true,
      timeSlot: true,
      hostArrivedAt: true,
      celebrantName: true
    }
  });

  console.log(`📋 Encontradas ${reservations.length} reservas con hostArrivedAt`);

  let corrected = 0;

  for (const reservation of reservations) {
    const reservationDate = reservation.date;
    const timeSlot = reservation.timeSlot; // e.g., "20:00"
    const currentHostArrivedAt = reservation.hostArrivedAt!;

    // Calcular la hora correcta (hora de la reserva)
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const correctHostArrivalTime = new Date(reservationDate);
    correctHostArrivalTime.setHours(hours, minutes, 0, 0);

    // Verificar si necesita corrección
    if (Math.abs(currentHostArrivedAt.getTime() - correctHostArrivalTime.getTime()) > 1000) { // Más de 1 segundo de diferencia
      console.log(`🔄 Corrigiendo reserva ${reservation.id} (${reservation.celebrantName}):`);
      console.log(`   - Actual: ${currentHostArrivedAt.toISOString()}`);
      console.log(`   - Correcto: ${correctHostArrivalTime.toISOString()}`);

      // Actualizar hostArrivedAt
      await prisma.birthdayReservation.update({
        where: { id: reservation.id },
        data: { hostArrivedAt: correctHostArrivalTime }
      });

      // Recalcular expiraciones de tokens
      const { recalculateTokenExpirations } = await import('../src/lib/birthdays/expiration-manager');
      await recalculateTokenExpirations(reservation.id);

      corrected++;
    }
  }

  console.log(`✅ Proceso completado. Se corrigieron ${corrected} reservas.`);
  await prisma.$disconnect();
}

fixHostArrivalTimes().catch(console.error);