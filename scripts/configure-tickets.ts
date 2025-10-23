import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TicketConfig {
  name: string;
  description?: string;
  price: number;
  capacity: number;
}

async function setupTicketsForShow(showSlug: string, ticketConfigs: TicketConfig[]) {
  try {
    // Buscar el show por slug
    const show = await prisma.show.findFirst({
      where: {
        slug: showSlug,
        status: 'PUBLISHED'
      }
    });

    if (!show) {
      console.error(`Show con slug "${showSlug}" no encontrado o no publicado`);
      return;
    }

    console.log(`Configurando tickets para: ${show.title}`);
    console.log(`Fecha: ${show.startsAt}`);
    console.log(`Slug: ${show.slug}`);

    // Verificar si ya tiene tickets
    const existingTickets = await prisma.ticketType.findMany({
      where: { showId: show.id }
    });

    if (existingTickets.length > 0) {
      console.log(`\nEl show ya tiene ${existingTickets.length} tipos de tickets:`);
      existingTickets.forEach(ticket => {
        console.log(`- ${ticket.name}: $${ticket.price} (${ticket.capacity} capacidad, ${ticket.soldCount} vendidos)`);
      });

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      await new Promise((resolve) => {
        rl.question('\n¿Deseas agregar más tickets? (y/n): ', (answer: string) => {
          rl.close();
          if (answer.toLowerCase() !== 'y') {
            console.log('Operación cancelada.');
            resolve(void 0);
            return;
          }
          resolve(void 0);
        });
      });
    }

    console.log('\nCreando tipos de tickets...');

    for (const config of ticketConfigs) {
      const ticket = await prisma.ticketType.create({
        data: {
          showId: show.id,
          name: config.name,
          description: config.description,
          price: config.price,
          capacity: config.capacity,
          availableFrom: new Date(), // Disponible desde ahora
          availableTo: show.startsAt // Hasta el inicio del show
        }
      });

      console.log(`✓ Creado: ${ticket.name} - $${ticket.price} (${ticket.capacity} disponibles)`);
    }

    console.log('\n¡Tickets configurados exitosamente!');
    console.log(`Los tickets están disponibles en: http://localhost:3001/shows/${show.slug}`);

  } catch (error) {
    console.error('Error configurando tickets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Configuración por defecto
const defaultTickets: TicketConfig[] = [
  {
    name: 'Entrada General',
    description: 'Entrada estándar para el show',
    price: 25.00,
    capacity: 100
  },
  {
    name: 'Entrada VIP',
    description: 'Entrada VIP con acceso preferencial y zona especial',
    price: 45.00,
    capacity: 30
  },
  {
    name: 'Entrada Estudiante',
    description: 'Entrada con descuento para estudiantes (con identificación)',
    price: 15.00,
    capacity: 50
  }
];

// Ejecutar con parámetros de línea de comandos
const args = process.argv.slice(2);
const showSlug = args[0] || 'sabado-04'; // Default al último show creado

console.log('=== CONFIGURADOR DE TICKETS PARA SHOWS ===');
console.log(`Configurando tickets para el show: ${showSlug}`);
console.log('');

setupTicketsForShow(showSlug, defaultTickets);