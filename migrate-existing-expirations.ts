import { PrismaClient } from '@prisma/client';
import { recalculateTokenExpirations } from './src/lib/birthdays/expiration-manager';

const prisma = new PrismaClient();

async function migrateExistingReservations() {
  try {
    // Encontrar todas las reservas que ya tienen hostArrivedAt registrado
    const reservationsWithArrival = await prisma.birthdayReservation.findMany({
      where: {
        hostArrivedAt: { not: null },
        tokensGeneratedAt: { not: null }
      },
      select: {
        id: true,
        celebrantName: true,
        hostArrivedAt: true,
        _count: {
          select: { inviteTokens: true }
        }
      }
    });

    console.log(`Encontradas ${reservationsWithArrival.length} reservas con llegada registrada`);

    let processed = 0;
    let errors = 0;

    for (const reservation of reservationsWithArrival) {
      try {
        console.log(`Procesando reserva ${reservation.id} (${reservation.celebrantName}) - Llegada: ${reservation.hostArrivedAt}`);
        await recalculateTokenExpirations(reservation.id);
        processed++;
      } catch (error) {
        console.error(`Error procesando reserva ${reservation.id}:`, error);
        errors++;
      }
    }

    console.log(`\nMigración completada:`);
    console.log(`- Procesadas: ${processed}`);
    console.log(`- Errores: ${errors}`);

  } catch (error) {
    console.error('Error en la migración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateExistingReservations();