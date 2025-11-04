const { PrismaClient } = require('@prisma/client');
const { DateTime } = require('luxon');

const prisma = new PrismaClient();

async function diagnoseFrontendIssue() {
  try {
    // Buscar reservas recientes con tokens generados
    const recentReservations = await prisma.birthdayReservation.findMany({
      where: {
        tokensGeneratedAt: { not: null },
        date: {
          gte: new Date('2025-10-20'), // Últimos días
          lte: new Date('2025-10-30')
        }
      },
      include: {
        inviteTokens: {
          select: {
            id: true,
            code: true,
            kind: true,
            status: true,
            expiresAt: true,
            maxUses: true,
            usedCount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('=== DIAGNÓSTICO DE RESERVAS RECIENTES ===\n');

    for (const reservation of recentReservations) {
      console.log(`🎂 Reserva: ${reservation.celebrantName}`);
      console.log(`📅 Fecha: ${reservation.date.toISOString().slice(0,10)}`);
      console.log(`🕐 Hora: ${reservation.timeSlot}`);
      console.log(`🏠 Host llegó: ${reservation.hostArrivedAt ? reservation.hostArrivedAt.toISOString() : 'NO'}`);
      console.log(`🎫 Tokens generados: ${reservation.tokensGeneratedAt ? 'SÍ' : 'NO'}`);

      console.log('\n📋 Tokens:');
      for (const token of reservation.inviteTokens) {
        const expiresAtLima = DateTime.fromJSDate(token.expiresAt).setZone('America/Lima');
        const expiresDisplay = expiresAtLima.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' });

        console.log(`  ${token.kind.toUpperCase()}: ${token.code}`);
        console.log(`    Estado: ${token.status}`);
        console.log(`    Expira: ${expiresDisplay} (${token.expiresAt.toISOString()})`);

        // Verificar si debería mostrar "45 min después" o la hora exacta
        if (reservation.hostArrivedAt) {
          const hostArrival = DateTime.fromJSDate(reservation.hostArrivedAt).setZone('America/Lima');
          const expectedExpiration = hostArrival.plus({ minutes: 45 });
          const actualExpiration = DateTime.fromJSDate(token.expiresAt).setZone('America/Lima');

          const diff = actualExpiration.diff(expectedExpiration).as('minutes');
          console.log(`    ✅ Host llegó - debería mostrar: ${expectedExpiration.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' })}`);
          console.log(`    📊 Diferencia real: ${diff.toFixed(1)} minutos`);
        } else {
          console.log(`    ⚠️  Host NO llegó - debería mostrar: "45 min después de llegada del cumpleañero"`);
          console.log(`    📊 Expira al final del día: ${expiresAtLima.endOf('day').toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' })}`);
        }
        console.log('');
      }
      console.log('─'.repeat(50));
    }

    // Verificar específicamente reservas de las 20:00
    console.log('\n=== RESERVAS DE LAS 20:00 ===\n');

    const eightPMReservations = await prisma.birthdayReservation.findMany({
      where: {
        timeSlot: '20:00',
        tokensGeneratedAt: { not: null },
        date: {
          gte: new Date('2025-10-20'),
          lte: new Date('2025-10-30')
        }
      },
      include: {
        inviteTokens: {
          select: {
            id: true,
            code: true,
            kind: true,
            status: true,
            expiresAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (eightPMReservations.length === 0) {
      console.log('❌ No se encontraron reservas de las 20:00 con tokens generados');
    } else {
      for (const reservation of eightPMReservations) {
        console.log(`🎂 ${reservation.celebrantName} - ${reservation.date.toISOString().slice(0,10)} 20:00`);
        console.log(`🏠 Host llegó: ${reservation.hostArrivedAt ? 'SÍ - ' + reservation.hostArrivedAt.toISOString() : 'NO'}`);

        for (const token of reservation.inviteTokens) {
          const expiresAtLima = DateTime.fromJSDate(token.expiresAt).setZone('America/Lima');
          const expiresDisplay = expiresAtLima.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'es-ES' });
          console.log(`  ${token.kind}: ${token.code} → Expira: ${expiresDisplay}`);
        }
        console.log('');
      }
    }

  } catch (error) {
    console.error('Error en diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseFrontendIssue();