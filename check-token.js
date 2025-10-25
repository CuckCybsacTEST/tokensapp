import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkToken() {
  try {
    const token = await prisma.inviteToken.findUnique({
      where: { code: 'VHHy9tAGkY' },
      include: { reservation: true }
    });

    if (!token) {
      console.log('Token not found');
      return;
    }

    console.log('Token details:');
    console.log('- Code:', token.code);
    console.log('- Kind:', token.kind);
    console.log('- Status:', token.status);
    console.log('- Used count:', token.usedCount);
    console.log('- Max uses:', token.maxUses);
    console.log('- Reservation guests planned:', token.reservation.guestsPlanned);

    const allTokens = await prisma.inviteToken.findMany({
      where: { reservationId: token.reservationId },
      select: { code: true, kind: true, usedCount: true, maxUses: true, status: true }
    });

    console.log('All tokens in reservation:');
    allTokens.forEach(t => {
      console.log(`- ${t.code}: ${t.kind}, used=${t.usedCount}/${t.maxUses}, status=${t.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkToken();