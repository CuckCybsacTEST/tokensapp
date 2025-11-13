#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno desde .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length) {
        let value = valueParts.join('=').trim();
        // Remover comillas si están presentes
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        process.env[key.trim()] = value;
      }
    }
  });
} else {
  console.error('❌ .env.local not found');
}

const prisma = new PrismaClient();

async function setAdminUser(dni: string) {
  try {
    console.log(`Buscando usuario con DNI: ${dni}`);

    // Buscar la persona por DNI
    const person = await prisma.person.findUnique({
      where: { dni },
      include: { user: true }
    });

    if (!person) {
      console.error(`❌ No se encontró persona con DNI: ${dni}`);
      return;
    }

    if (!person.user) {
      console.error(`❌ La persona con DNI ${dni} no tiene usuario asociado`);
      return;
    }

    const user = person.user;

    console.log(`Usuario encontrado: ${user.username} (ID: ${user.id})`);
    console.log(`Rol actual: ${user.role}`);

    if (user.role === 'ADMIN') {
      console.log(`✅ El usuario ya es administrador`);
      return;
    }

    // Actualizar el rol a ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    });

    console.log(`✅ Usuario actualizado exitosamente`);
    console.log(`Nuevo rol: ${updatedUser.role}`);
    console.log(`Nombre: ${person.name}`);
    console.log(`Username: ${updatedUser.username}`);

  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar con el DNI proporcionado
const dni = process.argv[2];
if (!dni) {
  console.error('❌ Debes proporcionar un DNI como argumento');
  console.error('Uso: tsx set-admin-user.ts 44645614');
  process.exit(1);
}

setAdminUser(dni);