const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkToken() {
  try {
    const token = await prisma.token.findUnique({
      where: { id: 'e58dc409-6ff9-47cb-9f6f-11914a9b8f22' },
      include: { prize: true, batch: true }
    });

    if (!token) {
      console.log('Token no encontrado');
      return;
    }

    console.log('Token ID:', token.id);
    console.log('Expires At (UTC):', token.expiresAt);
    console.log('Expires At (Lima):', new Date(token.expiresAt).toLocaleString('es-ES', { timeZone: 'America/Lima' }));
    console.log('Ahora (Lima):', new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' }));

    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    const isExpired = expiresAt < now;
    console.log('¿Expirado?', isExpired);

    if (!isExpired) {
      const diffMs = expiresAt - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      console.log('Tiempo restante:', diffHours + 'h ' + diffMinutes + 'm');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkToken();