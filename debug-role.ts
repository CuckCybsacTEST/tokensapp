import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'admin' },
      select: { id: true, username: true, role: true }
    });

    console.log('Usuario admin:', user);
    console.log('Tipo de role:', typeof user?.role);
    console.log('Valor de role:', JSON.stringify(user?.role));

    // Simular la lógica del login
    if (user) {
      const role = (user.role === "ADMIN" ? "ADMIN" : (user.role === "STAFF" ? "STAFF" : "COLLAB")) as "ADMIN" | "STAFF" | "COLLAB";
      console.log('Rol computado:', role);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();