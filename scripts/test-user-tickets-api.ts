#!/usr/bin/env tsx
/*
Script para probar la API de tickets del usuario
*/
import { prisma } from '../src/lib/prisma';

async function testTicketsAPI() {
  try {
    console.log('🧪 Probando API de tickets del usuario...\n');

    // 1. Verificar que hay tickets en la BD
    const totalTickets = await prisma.ticket.count();
    console.log(`📊 Total de tickets en BD: ${totalTickets}`);

    if (totalTickets === 0) {
      console.log('❌ No hay tickets en la base de datos');
      console.log('💡 Realiza una compra primero para generar tickets');
      return;
    }

    // 2. Mostrar algunos tickets de ejemplo
    const sampleTickets = await prisma.ticket.findMany({
      take: 3,
      include: {
        ticketPurchase: {
          include: {
            ticketType: {
              include: {
                show: true
              }
            },
            user: true
          }
        }
      }
    });

    console.log('\n🎫 Tickets de ejemplo:');
    sampleTickets.forEach((ticket: any, i: number) => {
      console.log(`\n${i + 1}. Ticket ID: ${ticket.id}`);
      console.log(`   QR Code: ${ticket.qrCode.substring(0, 30)}...`);
      console.log(`   Estado: ${ticket.status}`);
      console.log(`   Usuario: ${ticket.ticketPurchase.user?.name || 'N/A'} (${ticket.ticketPurchase.userId})`);
      console.log(`   Show: ${ticket.ticketPurchase.ticketType.show.title}`);
      console.log(`   Fecha: ${ticket.ticketPurchase.ticketType.show.startsAt}`);
    });

    // 3. Verificar que la API responde (aunque sin auth debería dar 401)
    console.log('\n🌐 Probando endpoint /api/tickets...');

    try {
      // @ts-ignore - fetch is available in Node 18+
      const response = await fetch('http://localhost:3000/api/tickets');
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ✅ API responde correctamente (requiere autenticación)');
      } else {
        const data = await response.json();
        console.log(`   Respuesta:`, data);
      }
    } catch (error) {
      console.log(`   ❌ Error conectando a la API: ${error}`);
    }

    console.log('\n✅ Prueba completada!');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTicketsAPI();
