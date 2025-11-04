import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDates() {
  try {
    // Get current database time
    const dbTimeResult = await prisma.$queryRaw`SELECT NOW() as current_time, CURRENT_DATE as current_date`;
    console.log('Database time:', dbTimeResult);

    // Get server time
    const serverTime = new Date();
    console.log('Server time:', serverTime);
    console.log('Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Check token expiration logic
    const expiredTokens = await prisma.inviteToken.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: {
        code: true,
        expiresAt: true,
        createdAt: true,
        status: true
      },
      take: 5
    });

    console.log('\nExpired tokens details:');
    expiredTokens.forEach(token => {
      console.log(`Code: ${token.code}, Created: ${token.createdAt}, Expires: ${token.expiresAt}, Status: ${token.status}`);
    });

  } catch (error) {
    console.error('Error checking dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDates();