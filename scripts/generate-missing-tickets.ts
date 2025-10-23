import { PrismaClient } from '@prisma/client';
import { generateQrPngDataUrl } from '../src/lib/qr';

const prisma = new PrismaClient();

// Función para generar tickets individuales con QRs (copiada del webhook)
async function generateTicketsWithQRs(purchase: any) {
  try {
    console.log(`Generando ${purchase.quantity} tickets con QRs para la compra ${purchase.id}`);

    const tickets = [];

    // Generar un ticket por cada unidad comprada
    for (let i = 0; i < purchase.quantity; i++) {
      // Generar código único para el QR (ticket específico)
      const ticketId = `${purchase.id}_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const qrCode = `TICKET_${ticketId}`;

      // Generar imagen QR como DataURL
      const qrDataUrl = await generateQrPngDataUrl(qrCode);

      // Crear ticket individual
      const ticket = await prisma.ticket.create({
        data: {
          ticketPurchaseId: purchase.id,
          ticketTypeId: purchase.ticketTypeId,
          qrCode,
          qrDataUrl,
          customerDni: purchase.customerDni,
          customerName: purchase.customerName,
          customerPhone: purchase.customerPhone,
          status: 'VALID',
        },
      });

      tickets.push(ticket);
    }

    console.log(`Generados ${tickets.length} tickets con QRs para la compra ${purchase.id}`);

    return tickets;
  } catch (error) {
    console.error('Error generando tickets con QRs:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔍 Buscando purchases CONFIRMED sin tickets generados...');

    // Encontrar purchases CONFIRMED que no tienen tickets
    const purchasesWithoutTickets = await prisma.ticketPurchase.findMany({
      where: {
        status: 'CONFIRMED',
      },
      include: {
        tickets: true,
        ticketType: true,
      }
    });

    const purchasesToFix = purchasesWithoutTickets.filter(purchase => purchase.tickets.length === 0);

    console.log(`📋 Encontradas ${purchasesToFix.length} purchases CONFIRMED sin tickets`);

    if (purchasesToFix.length === 0) {
      console.log('✅ Todas las purchases CONFIRMED ya tienen tickets generados');
      return;
    }

    console.log('\n🔧 Generando tickets faltantes...');

    for (const purchase of purchasesToFix) {
      try {
        console.log(`\n📝 Procesando purchase ${purchase.id} (${purchase.quantity} tickets)`);

        const tickets = await generateTicketsWithQRs(purchase);

        console.log(`✅ Generados ${tickets.length} tickets para ${purchase.customerName || 'Cliente sin nombre'}`);

      } catch (error) {
        console.error(`❌ Error procesando purchase ${purchase.id}:`, error);
      }
    }

    console.log('\n🎉 Proceso completado!');

    // Verificar resultados
    const finalCheck = await prisma.ticketPurchase.findMany({
      where: {
        status: 'CONFIRMED',
      },
      select: {
        id: true,
        customerName: true,
        quantity: true,
        _count: {
          select: { tickets: true }
        }
      }
    });

    console.log('\n📊 Verificación final:');
    finalCheck.forEach(p => {
      const status = p._count.tickets === p.quantity ? '✅' : '❌';
      console.log(`${status} ${p.id}: ${p._count.tickets}/${p.quantity} tickets - ${p.customerName || 'Sin nombre'}`);
    });

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();