import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTokens() {
  try {
    // Count tokens by status
    const totalTokens = await prisma.inviteToken.count();
    const activeTokens = await prisma.inviteToken.count({ where: { status: 'active' } });
    const redeemedTokens = await prisma.inviteToken.count({ where: { status: 'redeemed' } });
    const exhaustedTokens = await prisma.inviteToken.count({ where: { status: 'exhausted' } });
    const expiredTokens = await prisma.inviteToken.count({
      where: { expiresAt: { lt: new Date() } }
    });

    console.log('Token Status Summary:');
    console.log(`Total tokens: ${totalTokens}`);
    console.log(`Active tokens: ${activeTokens}`);
    console.log(`Redeemed tokens: ${redeemedTokens}`);
    console.log(`Exhausted tokens: ${exhaustedTokens}`);
    console.log(`Expired tokens: ${expiredTokens}`);

    // Get recent tokens
    const recentTokens = await prisma.inviteToken.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        reservation: {
          select: {
            celebrantName: true,
            date: true,
            status: true
          }
        }
      }
    });

    console.log('\nRecent Tokens:');
    recentTokens.forEach(token => {
      console.log(`Code: ${token.code}, Kind: ${token.kind}, Status: ${token.status}, Expires: ${token.expiresAt}, Reservation: ${token.reservation?.celebrantName} (${token.reservation?.date})`);
    });

  } catch (error) {
    console.error('Error checking tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTokens();