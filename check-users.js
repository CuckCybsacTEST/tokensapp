import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        username: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('Usuarios actuales:');
    users.forEach(user => {
      console.log(`${user.username}: ${user.role} (${user.createdAt})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();