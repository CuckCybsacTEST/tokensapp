#!/usr/bin/env tsx
/*
Script para probar la API de admin tickets individuales
*/
import { prisma } from '../src/lib/prisma';

async function testAdminTicketsAPI() {
  try {
    console.log('🧪 Probando API de admin tickets individuales...\n');

    // 1. Verificar que hay tickets en la BD
    const totalTickets = await (prisma as any).ticket.count();
    console.log(`📊 Total de tickets individuales en BD: ${totalTickets}`);

    if (totalTickets === 0) {
      console.log('❌ No hay tickets individuales en la base de datos');
      console.log('💡 Realiza una compra primero para generar tickets');
      return;
    }

    // 2. Probar la API directamente (simulando la consulta)
    console.log('\n🔍 Probando consulta de tickets para admin...');

    const tickets = await (prisma as any).ticket.findMany({
      include: {
        ticketPurchase: {
          include: {
            ticketType: {
              include: {
                show: {
                  select: {
                    id: true,
                    title: true,
                    startsAt: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    console.log(`✅ Consulta exitosa: ${tickets.length} tickets encontrados`);

    // 3. Mostrar algunos tickets de ejemplo
    const sampleTickets = tickets.slice(0, 3);
    console.log('\n🎫 Ejemplos de tickets para admin:');
    sampleTickets.forEach((ticket: any, i: number) => {
      console.log(`\n${i + 1}. Ticket ID: ${ticket.id}`);
      console.log(`   Cliente: ${ticket.customerName} (DNI: ${ticket.customerDni})`);
      console.log(`   Show: ${ticket.ticketPurchase.ticketType.show.title}`);
      console.log(`   Tipo: ${ticket.ticketPurchase.ticketType.name}`);
      console.log(`   Estado: ${ticket.status}`);
      console.log(`   QR Code: ${ticket.qrCode.substring(0, 30)}...`);
      console.log(`   Comprado: ${ticket.ticketPurchase.purchasedAt}`);
    });

    console.log('\n✅ Prueba completada exitosamente!');
    console.log('🎯 Los admins ahora pueden ver todos los tickets individuales en /admin/tickets');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminTicketsAPI();
