import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculateGuestArrivals() {
  try {
    console.log('Recalculating guest arrivals for all birthday reservations...');

    // Get all reservations that have tokens
    const reservations = await prisma.birthdayReservation.findMany({
      where: {
        tokensGeneratedAt: { not: null }
      },
      select: {
        id: true,
        celebrantName: true,
        guestArrivals: true
      }
    });

    console.log(`Found ${reservations.length} reservations with tokens`);

    let updated = 0;
    let totalArrivals = 0;

    for (const reservation of reservations) {
      // Calculate total guest arrivals by summing usedCount from all guest tokens
      const guestTokens = await prisma.inviteToken.findMany({
        where: {
          reservationId: reservation.id,
          kind: 'guest'
        },
        select: {
          usedCount: true
        }
      });

      const actualGuestArrivals = guestTokens.reduce((sum, token) => sum + (token.usedCount || 0), 0);

      if (actualGuestArrivals !== reservation.guestArrivals) {
        await prisma.birthdayReservation.update({
          where: { id: reservation.id },
          data: { guestArrivals: actualGuestArrivals }
        });

        console.log(`Updated ${reservation.celebrantName}: ${reservation.guestArrivals} → ${actualGuestArrivals}`);
        updated++;
      }

      totalArrivals += actualGuestArrivals;
    }

    console.log(`\nSummary:`);
    console.log(`- Total reservations processed: ${reservations.length}`);
    console.log(`- Reservations updated: ${updated}`);
    console.log(`- Total guest arrivals across all reservations: ${totalArrivals}`);

  } catch (error) {
    console.error('Error recalculating guest arrivals:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateGuestArrivals();
