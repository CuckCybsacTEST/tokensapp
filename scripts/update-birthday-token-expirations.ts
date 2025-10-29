import { ensureCorrectTokenExpirations } from '../src/lib/birthdays/expiration-manager';
import { prisma } from '../src/lib/prisma';

async function updateAllTokenExpirations() {
  console.log('🔄 Iniciando actualización de expiraciones de tokens de cumpleaños...');

  // Obtener todas las reservas que tienen tokens generados
  const reservations = await prisma.birthdayReservation.findMany({
    where: {
      tokensGeneratedAt: { not: null }
    },
    select: { id: true, date: true, timeSlot: true }
  });

  console.log(`📋 Encontradas ${reservations.length} reservas con tokens generados`);

  let successCount = 0;
  let errorCount = 0;

  for (const reservation of reservations) {
    try {
      console.log(`🔄 Actualizando expiraciones para reserva ${reservation.id}...`);
      await ensureCorrectTokenExpirations(reservation.id);
      successCount++;
    } catch (error) {
      console.error(`❌ Error actualizando reserva ${reservation.id}:`, error);
      errorCount++;
    }
  }

  console.log('✅ Actualización completada:');
  console.log(`   ✅ ${successCount} reservas actualizadas correctamente`);
  console.log(`   ❌ ${errorCount} errores`);

  await prisma.$disconnect();
}

updateAllTokenExpirations().catch(console.error);