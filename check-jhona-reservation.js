const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificReservation() {
  try {
    // Buscar la reserva específica que mencionó el usuario
    const reservation = await prisma.birthdayReservation.findFirst({
      where: {
        celebrantName: { contains: 'Jhona' },
        timeSlot: '20:00'
      },
      include: { inviteTokens: true }
    });

    if (!reservation) {
      console.log('No se encontró la reserva de Jhona');
      return;
    }

    console.log('=== RESERVA DE JHONA ATACHAGUA ===');
    console.log('ID:', reservation.id);
    console.log('Nombre:', reservation.celebrantName);
    console.log('Fecha:', reservation.date.toISOString().slice(0,10));
    console.log('Hora:', reservation.timeSlot);
    console.log('Host llegó:', reservation.hostArrivedAt ? reservation.hostArrivedAt.toISOString() : 'NULL');
    console.log('Host llegó (booleano):', !!reservation.hostArrivedAt);

    console.log('\n=== DATOS QUE RECIBIRÍA EL FRONTEND ===');

    // Simular respuesta de API para vista pública
    const apiResponsePublic = {
      public: true,
      hostArrivedAt: reservation.hostArrivedAt ? reservation.hostArrivedAt.toISOString() : null,
      token: {
        expiresAt: reservation.inviteTokens[0].expiresAt.toISOString()
      }
    };

    console.log('Respuesta API (pública):', JSON.stringify(apiResponsePublic, null, 2));

    // Simular cómo el frontend procesa esto
    const data = apiResponsePublic;
    const isPublic = data.public;
    const hostArrivedAt = isPublic ? data.hostArrivedAt : data.reservation?.hostArrivedAt;

    console.log('\n=== PROCESAMIENTO EN FRONTEND ===');
    console.log('isPublic:', isPublic);
    console.log('data.hostArrivedAt:', data.hostArrivedAt);
    console.log('hostArrivedAt (procesado):', hostArrivedAt);
    console.log('hostArrivedAt (booleano):', !!hostArrivedAt);

    if (hostArrivedAt) {
      console.log('✅ Debería mostrar hora exacta de expiración');
    } else {
      console.log('⚠️  Debería mostrar "45 min después de llegada del cumpleañero"');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificReservation();