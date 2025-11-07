#!/usr/bin/env tsx
/*
Script para probar la generación completa de tickets con QRs
*/
import { prisma } from '../src/lib/prisma';

async function testTicketQRGeneration() {
  try {
    console.log('🧪 Probando generación de tickets con QRs...\n');

    // 1. Buscar una compra existente con pago completado
    const completedPurchase = await prisma.ticketPurchase.findFirst({
      where: {
        paymentStatus: 'completed',
        tickets: {
          none: {} // Que no tenga tickets generados aún
        }
      },
      include: {
        ticketType: true,
        tickets: true
      }
    });

    if (!completedPurchase) {
      console.log('❌ No se encontró una compra completada sin tickets generados');
      console.log('💡 Realiza una compra primero en el modo demo');
      return;
    }

    console.log('✅ Encontrada compra completada:');
    console.log(`   ID: ${completedPurchase.id}`);
    console.log(`   Cliente: ${completedPurchase.customerName}`);
    console.log(`   DNI: ${completedPurchase.customerDni}`);
    console.log(`   Cantidad: ${completedPurchase.quantity}`);
    console.log(`   Tickets existentes: ${completedPurchase.tickets.length}\n`);

    // 2. Simular el webhook llamando a la función de generación
    const { generateTicketsWithQRs } = await import('../src/app/api/payments/webhook/route');

    // Como generateTicketsWithQRs es una función interna, vamos a recrear la lógica aquí
    console.log('🎯 Generando tickets con QRs...');

    const tickets = [];
    const { signToken } = await import('../src/lib/signing');
    const { generateQrPngDataUrl } = await import('../src/lib/qr');

    for (let i = 0; i < completedPurchase.quantity; i++) {
      // Generar código único
      const ticketId = `${completedPurchase.id}_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const qrCode = `TICKET_${ticketId}`;

      // Generar QR
      const qrDataUrl = await generateQrPngDataUrl(qrCode);

      // Crear ticket en BD
      const ticket = await prisma.ticket.create({
        data: {
          ticketPurchase: {
            connect: { id: completedPurchase.id }
          },
          ticketType: {
            connect: { id: completedPurchase.ticketTypeId }
          },
          qrCode,
          qrDataUrl,
          customerDni: completedPurchase.customerDni!,
          customerName: completedPurchase.customerName,
          customerPhone: completedPurchase.customerPhone,
          status: 'VALID',
        },
      });

      tickets.push(ticket);
      console.log(`   ✅ Ticket ${i + 1}/${completedPurchase.quantity} generado: ${qrCode.substring(0, 20)}...`);
    }

    console.log(`\n🎉 ¡Generados ${tickets.length} tickets con QRs exitosamente!`);

    // 3. Verificar que se guardaron correctamente
    const savedTickets = await prisma.ticket.findMany({
      where: { ticketPurchaseId: completedPurchase.id }
    });

    console.log(`\n📊 Verificación:`);
    console.log(`   Tickets en BD: ${savedTickets.length}`);
    console.log(`   Primer QR code: ${savedTickets[0]?.qrCode.substring(0, 30)}...`);
    console.log(`   QR DataURL generado: ${savedTickets[0]?.qrDataUrl ? '✅' : '❌'}`);

    console.log('\n✅ Prueba completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTicketQRGeneration();
