const { PrismaClient } = require('@prisma/client');

async function checkAPIResponse() {
  const prisma = new PrismaClient();

  try {
    // Buscar la reserva específica de Jhona Atachagua
    const reservation = await prisma.birthdayReservation.findFirst({
      where: {
        celebrantName: 'Jhona Atachagua',
        date: {
          gte: new Date('2025-10-26'),
          lt: new Date('2025-10-27')
        }
      }
    });

    if (!reservation) {
      console.log('❌ No se encontró la reserva de Jhona Atachagua');
      return;
    }

    console.log('=== RESERVA ENCONTRADA ===');
    console.log('ID:', reservation.id);
    console.log('Celebrant:', reservation.celebrantName);
    console.log('Date:', reservation.date);
    console.log('Host Arrived At:', reservation.hostArrivedAt);

    // Buscar el token del host para esta reserva
    const token = await prisma.inviteToken.findFirst({
      where: {
        reservationId: reservation.id,
        kind: 'host'
      }
    });

    if (!token) {
      console.log('❌ No se encontró token de host para esta reserva');
      return;
    }

    console.log('\n=== TOKEN ===');
    console.log('ID:', token.id);
    console.log('Code:', token.code);
    console.log('Expires At:', token.expiresAt);

    // Simular respuesta de API pública
    const publicResponse = {
      token: {
        id: token.id,
        code: token.code,
        expiresAt: token.expiresAt,
        isHost: token.isHost,
        celebrantName: token.celebrantName
      },
      hostArrivedAt: reservation.hostArrivedAt,
      public: true
    };

    console.log('\n=== RESPUESTA API PÚBLICA SIMULADA ===');
    console.log(JSON.stringify(publicResponse, null, 2));

    console.log('\n=== ANÁLISIS DEL FRONTEND ===');
    const data = publicResponse;
    const isPublic = data.public;
    const hostArrivedAt = isPublic ? data.hostArrivedAt : data.reservation?.hostArrivedAt;

    console.log('isPublic:', isPublic);
    console.log('hostArrivedAt:', hostArrivedAt);
    console.log('hostArrivedAt (booleano):', !!hostArrivedAt);

    if (hostArrivedAt) {
      console.log('✅ Frontend mostraría: hora exacta de expiración');
    } else {
      console.log('⚠️  Frontend mostraría: "45 min después de llegada del cumpleañero"');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAPIResponse();