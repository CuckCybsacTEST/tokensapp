#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { parseBirthdayInput } from '../src/lib/birthday';

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

interface UserRow {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  personCode: string;
  personName: string;
  dni: string;
  area: string;
  jobTitle: string;
  whatsapp: string;
  birthday: string;
}

async function parseCSV(csvPath: string): Promise<UserRow[]> {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  const rows: UserRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row as UserRow);
  }

  return rows;
}

async function importUsers(csvPath: string) {
  try {
    console.log('📄 Leyendo archivo CSV...');
    const users = await parseCSV(csvPath);
    console.log(`📊 Encontrados ${users.length} usuarios en el CSV`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const userData of users) {
      try {
        console.log(`\n👤 Procesando: ${userData.personName} (${userData.username})`);

        // Parsear fecha de nacimiento
        const birthday = parseBirthdayInput(userData.birthday);

        // Verificar si la persona ya existe
        let person = await prisma.person.findUnique({
          where: { code: userData.personCode },
          include: { user: true }
        });

        if (person) {
          console.log(`  📝 Persona existente, actualizando...`);
          person = await prisma.person.update({
            where: { code: userData.personCode },
            data: {
              name: userData.personName,
              dni: userData.dni || null,
              area: userData.area || null,
              jobTitle: userData.jobTitle || null,
              whatsapp: userData.whatsapp || null,
              birthday: birthday
            },
            include: { user: true }
          });
        } else {
          console.log(`  ✨ Creando nueva persona...`);
          person = await prisma.person.create({
            data: {
              code: userData.personCode,
              name: userData.personName,
              dni: userData.dni || null,
              area: userData.area || null,
              jobTitle: userData.jobTitle || null,
              whatsapp: userData.whatsapp || null,
              birthday: birthday
            },
            include: { user: true }
          });
          created++;
        }

        // Verificar si el usuario ya existe
        let user = person.user;

        if (user) {
          console.log(`  📝 Usuario existente, actualizando rol...`);
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              role: userData.role,
              username: userData.username
            }
          });
          updated++;
        } else {
          console.log(`  ✨ Creando nuevo usuario...`);
          // Generar hash de contraseña (usando DNI como contraseña por defecto)
          const passwordHash = await bcrypt.hash(userData.dni, 12);

          user = await prisma.user.create({
            data: {
              username: userData.username,
              passwordHash,
              role: userData.role,
              personId: person.id,
              forcePasswordChange: true // Forzar cambio de contraseña en primer login
            }
          });
          created++;
        }

        console.log(`  ✅ ${userData.role} - ${userData.username}`);

      } catch (error) {
        console.error(`  ❌ Error procesando ${userData.personName}:`, error);
        skipped++;
      }
    }

    console.log(`\n📈 Resumen:`);
    console.log(`  ✅ Creados: ${created}`);
    console.log(`  📝 Actualizados: ${updated}`);
    console.log(`  ❌ Saltados: ${skipped}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el import
const csvPath = process.argv[2] || 'users.csv';
if (!fs.existsSync(csvPath)) {
  console.error(`❌ Archivo CSV no encontrado: ${csvPath}`);
  console.error('Uso: tsx import-users.ts [ruta/al/archivo.csv]');
  process.exit(1);
}

console.log('🚀 Iniciando importación de usuarios...');
importUsers(csvPath);