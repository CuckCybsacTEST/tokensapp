import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testHostArrival(code) {
  console.log(`Testing host arrival for code: ${code}`);

  // First, get current state
  const token = await prisma.inviteToken.findUnique({
    where: { code },
    include: { reservation: true }
  });

  if (!token) {
    console.log('Token not found');
    return;
  }

  console.log('BEFORE validation:');
  console.log(`- Token status: ${token.status}`);
  console.log(`- Host arrived at: ${token.reservation.hostArrivedAt}`);

  // Simulate POST validation (what happens when staff validates)
  if (token.kind === 'host') {
    console.log('Simulating host token validation...');

    // Update hostArrivedAt
    await prisma.birthdayReservation.update({
      where: { id: token.reservation.id },
      data: { hostArrivedAt: new Date() }
    });

    // Update token status if needed
    if (token.status !== 'redeemed' && token.status !== 'exhausted') {
      await prisma.inviteToken.update({
        where: { code },
        data: { status: 'redeemed' }
      });
    }

    console.log('Host arrival recorded');
  }

  // Check state after
  const tokenAfter = await prisma.inviteToken.findUnique({
    where: { code },
    include: { reservation: true }
  });

  console.log('AFTER validation:');
  console.log(`- Token status: ${tokenAfter?.status}`);
  console.log(`- Host arrived at: ${tokenAfter?.reservation.hostArrivedAt}`);

  await prisma.$disconnect();
}

// Ejecutar con el código del token como argumento
const code = process.argv[2];
if (!code) {
  console.log('Uso: node test-host-arrival.js <codigo>');
  process.exit(1);
}

testHostArrival(code);