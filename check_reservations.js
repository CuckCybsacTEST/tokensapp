import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservations() {
  try {
    const total = await prisma.birthdayReservation.count({
      where: { tokensGeneratedAt: { not: null } }
    });
    console.log('📊 Total reservations with tokens:', total);

    const byStatus = await prisma.birthdayReservation.groupBy({
      by: ['status'],
      where: { tokensGeneratedAt: { not: null } },
      _count: true
    });
    console.log('📈 By status:', byStatus);

    // Check upcoming reservations (from today)
    const today = new Date();
    const limaToday = new Date(today.getTime() - 5 * 3600 * 1000);
    const startOfToday = new Date(limaToday.getFullYear(), limaToday.getMonth(), limaToday.getDate());

    const upcoming = await prisma.birthdayReservation.count({
      where: {
        tokensGeneratedAt: { not: null },
        date: { gte: startOfToday }
      }
    });
    console.log('🔮 Upcoming reservations (from today):', upcoming);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservations();