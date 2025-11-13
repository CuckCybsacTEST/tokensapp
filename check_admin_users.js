const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUsers() {
  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, username: true, role: true, person: { select: { name: true, code: true } } }
    });

    console.log('Usuarios ADMIN encontrados:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log(`- ${user.username} (${user.person?.name}) - Role: ${user.role}`);
    });

    if (adminUsers.length === 0) {
      console.log('No hay usuarios ADMIN. Usuarios totales:');
      const allUsers = await prisma.user.findMany({
        select: { username: true, role: true, person: { select: { name: true } } }
      });
      allUsers.forEach(user => {
        console.log(`- ${user.username} (${user.person?.name}) - Role: ${user.role}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUsers();