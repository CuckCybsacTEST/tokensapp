import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        person: { select: { name: true } }
      }
    });

    console.log('Usuarios en la base de datos:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Name: ${user.person?.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();