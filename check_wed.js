const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const config = await prisma.systemConfig.findFirst();
    console.log('SystemConfig:', config);

    const token = await prisma.inviteToken.findUnique({
      where: { code: 'x2yn2IhPQ4' },
      include: { reservation: { include: { pack: true } } }
    });

    if (token && token.reservation) {
      const date = token.reservation.date;
      const day = date.getDay();
      console.log('Reservation date:', date);
      console.log('Day of week:', day); // 0=Sun, 3=Wed
      console.log('Is Wednesday:', day === 3);
      console.log('Pack price:', token.reservation.pack?.priceSoles);
      console.log('Is free pack:', token.reservation.pack?.priceSoles === 0);
      console.log('Should apply special bottle:', day === 3 && token.reservation.pack?.priceSoles === 0);
      console.log('Actual bottle:', token.reservation.specialBottle || token.reservation.pack?.bottle);
    } else {
      console.log('Token not found');
    }
  } finally {
    await prisma.$disconnect();
  }
}

check();