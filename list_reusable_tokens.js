import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listReusableTokens() {
  try {
    const tokens = await prisma.reusableToken.findMany({
      select: {
        id: true,
        signature: true,
        maxUses: true,
        prize: { select: { label: true } }
      },
      take: 20 // limit to 20
    });

    console.log('Reusable Tokens:');
    tokens.forEach(token => {
      console.log(`ID: ${token.id}, Signature: ${token.signature}, MaxUses: ${token.maxUses}, Prize: ${token.prize.label}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listReusableTokens();