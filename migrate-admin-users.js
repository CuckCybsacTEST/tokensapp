import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function migrateAdminUsers() {
  try {
    console.log('Iniciando migración de usuarios admin...');

    // Verificar si ya existe un usuario admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('Ya existe un usuario admin:', existingAdmin.username);
      return;
    }

    // Crear persona para el admin
    const adminPerson = await prisma.person.create({
      data: {
        code: 'ADMIN001',
        name: 'Administrator',
        dni: '00000000',
        area: 'ADMIN',
        active: true,
        whatsapp: '0000000000',
        birthday: new Date('2000-01-01')
      }
    });

    // Crear usuario admin
    const salt = bcrypt.genSaltSync(10);
    const password = process.env.ADMIN_PASSWORD || 'admin-admin';
    const passwordHash = bcrypt.hashSync(password, salt);

    const adminUser = await prisma.user.create({
      data: {
        username: process.env.ADMIN_USERNAME || 'admin',
        passwordHash,
        role: 'ADMIN',
        personId: adminPerson.id
      }
    });

    console.log('Usuario admin creado exitosamente:', adminUser.username);

  } catch (error) {
    console.error('Error en migración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAdminUsers();