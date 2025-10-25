import { PrismaClient } from '@prisma/client';
import { recalculateTokenExpirations } from '../src/lib/birthdays/expiration-manager';

const prisma = new PrismaClient();

async function migrateTokenExpirations() {
  console.log('Iniciando migración de expiraciones de tokens...');

  // Obtener todas las reservas que tienen tokens generados
  const reservations = await prisma.birthdayReservation.findMany({
    where: {
      tokensGeneratedAt: { not: null }
    },
    select: { id: true, date: true, tokensGeneratedAt: true }
  });

  console.log(`Encontradas ${reservations.length} reservas con tokens generados`);

  for (const reservation of reservations) {
    try {
      console.log(`Recalculando expiraciones para reserva ${reservation.id} (fecha: ${reservation.date.toISOString()})`);
      await recalculateTokenExpirations(reservation.id);
    } catch (error) {
      console.error(`Error recalculando reserva ${reservation.id}:`, error);
    }
  }

  console.log('Migración completada');
  await prisma.$disconnect();
}

migrateTokenExpirations().catch(console.error);