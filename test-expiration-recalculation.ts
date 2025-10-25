import { PrismaClient } from '@prisma/client';
import { recalculateTokenExpirations } from './src/lib/birthdays/expiration-manager';

const prisma = new PrismaClient();

async function testExpirationRecalculation() {
  try {
    // Buscar una reserva reciente con tokens
    const recentReservation = await prisma.birthdayReservation.findFirst({
      where: {
        tokensGeneratedAt: { not: null },
        hostArrivedAt: null // Que no haya llegado aún
      },
      include: {
        inviteTokens: {
          select: {
            id: true,
            code: true,
            kind: true,
            expiresAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!recentReservation) {
      console.log('No se encontró ninguna reserva reciente sin llegada registrada');
      return;
    }

    console.log('Reserva encontrada:', {
      id: recentReservation.id,
      celebrantName: recentReservation.celebrantName,
      tokensCount: recentReservation.inviteTokens.length,
      hostArrivedAt: recentReservation.hostArrivedAt
    });

    console.log('Tokens antes de la recalculación:');
    recentReservation.inviteTokens.forEach(token => {
      console.log(`  ${token.kind}: ${token.code} - Expira: ${token.expiresAt}`);
    });

    // Simular llegada del host
    console.log('\nSimulando llegada del host...');
    await prisma.birthdayReservation.update({
      where: { id: recentReservation.id },
      data: { hostArrivedAt: new Date() }
    });

    // Recalcular expiraciones
    console.log('Recalculando expiraciones...');
    const result = await recalculateTokenExpirations(recentReservation.id);

    console.log('Resultado:', result);

    // Verificar tokens después
    const updatedReservation = await prisma.birthdayReservation.findUnique({
      where: { id: recentReservation.id },
      include: {
        inviteTokens: {
          select: {
            id: true,
            code: true,
            kind: true,
            expiresAt: true
          }
        }
      }
    });

    console.log('\nTokens después de la recalculación:');
    updatedReservation?.inviteTokens.forEach(token => {
      console.log(`  ${token.kind}: ${token.code} - Expira: ${token.expiresAt}`);
    });

  } catch (error) {
    console.error('Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testExpirationRecalculation();