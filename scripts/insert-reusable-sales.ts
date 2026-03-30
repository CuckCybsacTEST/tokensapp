import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function insertReusableSales() {
  // Delete existing for the day
  await prisma.reusableToken.deleteMany({
    where: {
      redeemedAt: {
        gte: new Date('2026-03-25T00:00:00.000Z'),
        lte: new Date('2026-03-25T23:59:59.999Z')
      }
    }
  });

  // Find prize IDs
  const prizes = await prisma.reusablePrize.findMany({
    where: {
      label: {
        in: [
          'KTBOOM 3lt — s/19.90',
          'JW RED LABEL + COCA COLA — s/99.90',
          'OLD TIMES RED + COCA COLA — s/49.90',
          'VODKA RUSSKAYA + NECTAR — s/49.90'
        ]
      }
    }
  });

  const prizeMap = new Map(prizes.map(p => [p.label, p.id]));

  // Insert tokens
  const inserts = [
    ...Array(5).fill('KTBOOM 3lt — s/19.90'),
    ...Array(3).fill('JW RED LABEL + COCA COLA — s/99.90'),
    ...Array(3).fill('OLD TIMES RED + COCA COLA — s/49.90'),
    'VODKA RUSSKAYA + NECTAR — s/49.90'
  ];

  for (const label of inserts) {
    const prizeId = prizeMap.get(label);
    if (prizeId) {
      await prisma.reusableToken.create({
        data: {
          prizeId,
          expiresAt: new Date('2026-03-26T00:00:00.000Z'), // Next day
          redeemedAt: new Date('2026-03-25T12:00:00.000Z'), // Within the day
          signature: 'test-signature',
          signatureVersion: 1
        }
      });
    }
  }

  console.log('Inserted 12 reusable tokens for 2026-03-25');
}

insertReusableSales().catch(console.error).finally(() => prisma.$disconnect());