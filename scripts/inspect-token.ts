import { prisma } from '../src/lib/prisma';
import { DateTime } from 'luxon';

async function main() {
  const tokenId = '506f7a53-4107-4654-a63b-fba868f52c21';
  
  const token = await prisma.token.findUnique({
    where: { id: tokenId },
    include: {
      batch: true,
      prize: true
    }
  });

  if (!token) {
    console.log(`Token ${tokenId} no encontrado.`);
    return;
  }

  const expiresAt = DateTime.fromJSDate(token.expiresAt);
  const expiresAtLima = expiresAt.setZone('America/Lima');
  
  const createdAt = DateTime.fromJSDate(token.createdAt);
  const createdAtLima = createdAt.setZone('America/Lima');

  console.log(JSON.stringify({
    id: token.id,
    batchId: token.batchId,
    batchName: token.batch?.description,
    prize: token.prize?.label,
    createdAt: {
        raw: token.createdAt,
        lima: createdAtLima.toISO(),
        formateada: createdAtLima.toFormat('dd/MM/yyyy HH:mm:ss')
    },
    expiresAt: {
        raw: token.expiresAt,
        lima: expiresAtLima.toISO(),
        formateada: expiresAtLima.toFormat('dd/MM/yyyy HH:mm:ss'),
        isMidnight: expiresAtLima.hour === 23 && expiresAtLima.minute === 59,
        is3AM: expiresAtLima.hour === 2 && expiresAtLima.minute === 59 // 02:59:59 es el límite de 3AM
    },
    status: {
        redeemedAt: token.redeemedAt,
        disabled: token.disabled
    }
  }, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
