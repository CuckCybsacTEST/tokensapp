import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateReusableTokenLimits() {
  const signatures = ['reusable_sig_325F8DB888B6CCFA', 'reusable_sig_0F58A1948BE0327C'];
  const newLimit = 35;

  for (const signature of signatures) {
    try {
      const token = await prisma.reusableToken.findFirst({
        where: { signature: signature },
        include: { prize: true }
      });

      if (!token) {
        console.log(`Token con firma ${signature} no encontrado.`);
        continue;
      }

      console.log(`=== TOKEN ANTES DE ACTUALIZAR ===`);
      console.log(`Firma: ${token.signature}`);
      console.log(`Usos máximos actuales: ${token.maxUses}`);
      console.log(`Premio: ${token.prize.label}`);

      await prisma.reusableToken.update({
        where: { id: token.id },
        data: { maxUses: newLimit }
      });

      console.log(`=== TOKEN ACTUALIZADO ===`);
      console.log(`Usos máximos nuevos: ${newLimit}`);
      console.log('---');

    } catch (error) {
      console.error(`Error actualizando token ${signature}:`, error);
    }
  }

  await prisma.$disconnect();
}

updateReusableTokenLimits();