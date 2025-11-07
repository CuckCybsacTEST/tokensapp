import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Cambiar el rol del usuario específico a ADMIN
    const userId = 'cmho3t61700029lnjpd6bwz8c';

    console.log('Buscando usuario con ID:', userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, person: { select: { name: true } } }
    });

    if (!user) {
      console.log('Usuario no encontrado');
      return;
    }

    console.log('Usuario encontrado:', user);

    // Cambiar rol a ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
      select: { id: true, username: true, role: true }
    });

    console.log('Usuario actualizado:', updatedUser);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();