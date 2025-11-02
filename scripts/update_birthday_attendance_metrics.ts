import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

async function updateBirthdayAttendanceMetrics() {
  try {
    console.log('🔄 Updating birthday attendance metrics for all reservations...');

    // Get all reservations that have tokens generated
    const reservations = await prisma.birthdayReservation.findMany({
      where: {
        tokensGeneratedAt: { not: null }
      },
      select: {
        id: true,
        celebrantName: true,
        date: true,
        timeSlot: true,
        hostArrivedAt: true,
        guestArrivals: true
      }
    });

    console.log(`📊 Found ${reservations.length} reservations with tokens`);

    let hostArrivalsUpdated = 0;
    let guestArrivalsUpdated = 0;
    let totalGuestArrivals = 0;
    let totalHostArrivals = 0;

    for (const reservation of reservations) {
      console.log(`\n🔍 Processing reservation: ${reservation.celebrantName} (${reservation.id})`);

      // 1. Update hostArrivedAt based on first host token redemption
      const hostRedemptions = await prisma.tokenRedemption.findMany({
        where: {
          reservationId: reservation.id,
          token: { kind: 'host' }
        },
        orderBy: { redeemedAt: 'asc' },
        select: { redeemedAt: true }
      });

      let newHostArrivedAt = reservation.hostArrivedAt;
      if (hostRedemptions.length > 0) {
        // Use the earliest host redemption as arrival time
        const firstHostRedemption = hostRedemptions[0];
        newHostArrivedAt = firstHostRedemption.redeemedAt;

        if (!reservation.hostArrivedAt || reservation.hostArrivedAt.getTime() !== newHostArrivedAt.getTime()) {
          console.log(`  🏠 Host arrived: ${newHostArrivedAt.toISOString()}`);
          hostArrivalsUpdated++;
          totalHostArrivals++;
        } else {
          console.log(`  ✅ Host arrival already correct: ${newHostArrivedAt.toISOString()}`);
        }
      } else {
        console.log(`  ⚠️  No host redemptions found`);
      }

      // 2. Update guestArrivals based on guest token redemptions
      const guestRedemptions = await prisma.tokenRedemption.findMany({
        where: {
          reservationId: reservation.id,
          token: { kind: 'guest' }
        },
        select: { id: true }
      });

      const actualGuestArrivals = guestRedemptions.length;
      let guestArrivalsChanged = false;

      if (actualGuestArrivals !== reservation.guestArrivals) {
        console.log(`  👥 Guest arrivals: ${reservation.guestArrivals} → ${actualGuestArrivals}`);
        guestArrivalsUpdated++;
        guestArrivalsChanged = true;
      } else {
        console.log(`  ✅ Guest arrivals already correct: ${actualGuestArrivals}`);
      }

      totalGuestArrivals += actualGuestArrivals;

      // Update the reservation if any metrics changed
      if ((newHostArrivedAt && (!reservation.hostArrivedAt || reservation.hostArrivedAt.getTime() !== newHostArrivedAt.getTime())) || guestArrivalsChanged) {
        const updateData: any = {};
        if (newHostArrivedAt && (!reservation.hostArrivedAt || reservation.hostArrivedAt.getTime() !== newHostArrivedAt.getTime())) {
          updateData.hostArrivedAt = newHostArrivedAt;
        }
        if (guestArrivalsChanged) {
          updateData.guestArrivals = actualGuestArrivals;
        }

        await prisma.birthdayReservation.update({
          where: { id: reservation.id },
          data: updateData
        });

        console.log(`  💾 Updated reservation metrics`);
      } else {
        console.log(`  ✨ No updates needed`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`- Total reservations processed: ${reservations.length}`);
    console.log(`- Host arrivals updated: ${hostArrivalsUpdated}`);
    console.log(`- Guest arrivals updated: ${guestArrivalsUpdated}`);
    console.log(`- Total host arrivals: ${totalHostArrivals}`);
    console.log(`- Total guest arrivals: ${totalGuestArrivals}`);
    console.log(`\n✅ Attendance metrics update completed successfully!`);

  } catch (error) {
    console.error('❌ Error updating birthday attendance metrics:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateBirthdayAttendanceMetrics();