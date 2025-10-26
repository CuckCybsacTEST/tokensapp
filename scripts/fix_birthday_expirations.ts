import { PrismaClient } from '@prisma/client';
import { recalculateTokenExpirations } from '../src/lib/birthdays/expiration-manager';

const prisma = new PrismaClient();

async function fixBirthdayExpirations() {
  console.log('Corrigiendo expiraciones de tokens de cumpleaños que fueron sobrescritas...');

  // Find all birthday reservations that have hostArrivedAt (meaning host has arrived)
  // and have tokens generated
  const reservationsWithHostArrival = await prisma.birthdayReservation.findMany({
    where: {
      hostArrivedAt: { not: null },
      tokensGeneratedAt: { not: null }
    },
    select: {
      id: true,
      date: true,
      timeSlot: true,
      hostArrivedAt: true,
      celebrantName: true
    }
  });

  console.log(`Encontradas ${reservationsWithHostArrival.length} reservas con llegada del host`);

  let fixed = 0;
  let errors = 0;

  for (const reservation of reservationsWithHostArrival) {
    try {
      console.log(`Recalculando expiraciones para reserva ${reservation.id} (${reservation.celebrantName})`);
      console.log(`  Fecha reserva: ${reservation.date}, Hora: ${reservation.timeSlot}`);
      console.log(`  Host llegó: ${reservation.hostArrivedAt}`);

      await recalculateTokenExpirations(reservation.id);

      // Verify the fix
      const tokens = await prisma.inviteToken.findMany({
        where: { reservationId: reservation.id },
        select: { code: true, expiresAt: true, kind: true }
      });

      console.log(`  Tokens actualizados:`);
      tokens.forEach(token => {
        console.log(`    ${token.kind}: ${token.code} - Expira: ${token.expiresAt}`);
      });

      fixed++;
    } catch (error) {
      console.error(`Error corrigiendo reserva ${reservation.id}:`, error);
      errors++;
    }
  }

  console.log(`\nCorrección completada: ${fixed} exitosas, ${errors} errores`);
  await prisma.$disconnect();
}

fixBirthdayExpirations().catch(console.error);