import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Buscar la persona por DNI
  const person = await prisma.person.findUnique({ where: { dni: '71035458' } });
  if (!person) {
    console.log('No se encontró persona con DNI 71035458');
    return;
  }

  // Buscar el usuario
  const user = await prisma.user.findUnique({ where: { personId: person.id } });
  if (!user) {
    console.log('No se encontró usuario');
    return;
  }

  console.log('User ID:', user.id);
  console.log('Person area:', person.area);

  // Buscar staff
  const staff = await prisma.staff.findUnique({ where: { userId: user.id } });
  console.log('Staff role:', staff?.role);

  // Buscar user.role
  console.log('User role:', user.role);

  const roles = await prisma.staff.findMany({ select: { role: true } });
  const uniqueRoles = [...new Set(roles.map(r => r.role))];
  console.log('Roles únicos en staff:', uniqueRoles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
