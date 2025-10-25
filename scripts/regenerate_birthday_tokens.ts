import { PrismaClient } from '@prisma/client';
import { generateInviteTokens } from '@/lib/birthdays/service';

const prisma = new PrismaClient();

async function regenerateActiveBirthdayTokens() {
  try {
    // Find all birthday reservations that have tokens generated
    // Include reservations from the past few days that might still have valid tokens
    const recentReservations = await prisma.birthdayReservation.findMany({
      where: {
        tokensGeneratedAt: { not: null },
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      },
      select: {
        id: true,
        date: true,
        celebrantName: true,
        tokensGeneratedAt: true
      }
    });

    console.log(`Found ${recentReservations.length} recent birthday reservations with tokens`);

    let regenerated = 0;
    let errors = 0;

    for (const reservation of recentReservations) {
      try {
        console.log(`Regenerating tokens for reservation ${reservation.id} (${reservation.celebrantName}) - Date: ${reservation.date}`);
        await generateInviteTokens(reservation.id, { force: true }, 'SYSTEM');
        regenerated++;
      } catch (error) {
        console.error(`Error regenerating tokens for reservation ${reservation.id}:`, error);
        errors++;
      }
    }

    console.log(`Regeneration complete: ${regenerated} successful, ${errors} errors`);

  } catch (error) {
    console.error('Error in regeneration script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateActiveBirthdayTokens();