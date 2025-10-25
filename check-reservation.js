import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

async function checkReservationStatus(code) {
  console.log(`Checking reservation status for code: ${code}`);

  const token = await prisma.inviteToken.findUnique({
    where: { code },
    include: {
      reservation: {
        include: {
          inviteTokens: true
        }
      }
    }
  });

  if (!token) {
    console.log('Token not found');
    return;
  }

  const reservation = token.reservation;
  console.log('Reservation details:');
  console.log(`- ID: ${reservation.id}`);
  console.log(`- Date: ${reservation.date}`);
  console.log(`- Time Slot: ${reservation.timeSlot}`);
  console.log(`- Host Arrived At: ${reservation.hostArrivedAt}`);
  console.log(`- Guest Arrivals: ${reservation.guestArrivals}`);

  console.log('\nToken details:');
  console.log(`- Code: ${token.code}`);
  console.log(`- Kind: ${token.kind}`);
  console.log(`- Status: ${token.status}`);
  console.log(`- Expires At: ${token.expiresAt}`);
  console.log(`- Current time: ${new Date().toISOString()}`);

  if (reservation.hostArrivedAt) {
    const hostArrivalDateTime = DateTime.fromJSDate(reservation.hostArrivedAt).setZone('America/Lima');
    const expectedExpiration = hostArrivalDateTime.plus({ minutes: 45 }).toJSDate();
    console.log(`- Expected expiration (45 min after host arrival): ${expectedExpiration}`);
    console.log(`- Actual expiration matches expected: ${token.expiresAt.getTime() === expectedExpiration.getTime()}`);
  } else {
    console.log('- Host has not arrived yet, tokens should have initial 24-hour expiration');
  }

  console.log('\nAll tokens in reservation:');
  reservation.inviteTokens.forEach(t => {
    console.log(`- ${t.code} (${t.kind}): expires ${t.expiresAt}`);
  });
}

// Get code from command line argument
const code = process.argv[2];
if (!code) {
  console.log('Usage: node check-reservation.js <token-code>');
  process.exit(1);
}

checkReservationStatus(code)
  .catch(console.error)
  .finally(() => prisma.$disconnect());