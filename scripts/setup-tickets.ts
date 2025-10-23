import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTicketTypes() {
  try {
    // Primero obtenemos los shows publicados
    const shows = await prisma.show.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, slug: true, startsAt: true }
    });

    console.log('Shows publicados encontrados:');
    shows.forEach((show, index) => {
      console.log(`${index + 1}. ${show.title} (${show.slug}) - ${show.startsAt}`);
    });

    if (shows.length === 0) {
      console.log('No hay shows publicados. Primero crea un show.');
      return;
    }

    // Para este ejemplo, vamos a configurar tickets para el primer show
    const targetShow = shows[0];
    console.log(`\nConfigurando tickets para: ${targetShow.title}`);

    // Tipos de tickets comunes
    const ticketTypes = [
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

    console.log('\nCreando tipos de tickets...');

    for (const ticketType of ticketTypes) {
      const created = await prisma.ticketType.create({
        data: {
          showId: targetShow.id,
          name: ticketType.name,
          description: ticketType.description,
          price: ticketType.price,
          capacity: ticketType.capacity,
          availableFrom: new Date(), // Disponible desde ahora
          availableTo: targetShow.startsAt // Hasta el inicio del show
        }
      });

      console.log(`✓ Creado: ${created.name} - $${created.price} (${created.capacity} disponibles)`);
    }

    console.log('\n¡Tickets configurados exitosamente!');
    console.log(`Los tickets están disponibles en: http://localhost:3001/shows/${targetShow.slug}`);

  } catch (error) {
    console.error('Error configurando tickets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
createTicketTypes();