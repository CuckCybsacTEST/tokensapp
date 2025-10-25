import { PrismaClient } from '@prisma/client';
import { signBirthdayClaim } from '../src/lib/birthdays/token';

const prisma = new PrismaClient();

async function regenerateTokenClaims() {
  console.log('Regenerando claims de tokens con expiraciones corregidas...');

  // Obtener todos los tokens que tienen claims
  const tokens = await prisma.inviteToken.findMany({
    where: {
      claim: { not: '' }
    },
    include: {
      reservation: true
    }
  });

  console.log(`Encontrados ${tokens.length} tokens con claims`);

  for (const token of tokens) {
    try {
      console.log(`Regenerando claim para token ${token.code} (${token.kind})`);

      // Calcular la expiración correcta basada en la fecha de reserva
      const reservationDateLima = new Date(token.reservation.date).toISOString() === token.reservation.date.toISOString()
        ? new Date(token.reservation.date.getTime() + (5 * 60 * 60 * 1000)) // Si es 00:00, agregar 5 horas
        : token.reservation.date;

      // Para simplificar, usar la expiración que ya está en el token (ya corregida)
      const expSec = Math.floor(token.expiresAt.getTime() / 1000);
      const iatSec = Math.floor(token.createdAt.getTime() / 1000);

      const claimPayload = {
        t: 'birthday',
        rid: token.reservationId,
        kind: token.kind,
        code: token.code,
        iat: iatSec,
        exp: expSec
      };

      const signed = signBirthdayClaim(claimPayload as any);
      const claimJson = JSON.stringify(signed);

      await prisma.inviteToken.update({
        where: { id: token.id },
        data: { claim: claimJson }
      });

      console.log(`  ✅ Claim regenerado`);
    } catch (error) {
      console.error(`Error regenerando claim para token ${token.code}:`, error);
    }
  }

  console.log('Regeneración de claims completada');
  await prisma.$disconnect();
}

regenerateTokenClaims().catch(console.error);