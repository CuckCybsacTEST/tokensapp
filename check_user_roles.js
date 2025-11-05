const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserRoles() {
  try {
    const users = await prisma.user.findMany({
      where: {
        person: {
          dni: {
            in: ['71035458', '42459672']
          }
        }
      },
      include: {
        person: true
      }
    });

    console.log('Roles de usuario en tabla User:');
    users.forEach(user => {
      console.log(`DNI: ${user.person.dni}, Nombre: ${user.person.name}, Role en User: ${user.role}, Area en Person: ${user.person.area}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRoles();