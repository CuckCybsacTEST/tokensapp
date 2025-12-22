
import { prisma } from './src/lib/prisma';

async function main() {
  try {
    const count = await prisma.rouletteSession.count();
    console.log('Total RouletteSessions:', count);
    
    const sessions = await prisma.rouletteSession.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log('Last 5 sessions:', JSON.stringify(sessions, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
