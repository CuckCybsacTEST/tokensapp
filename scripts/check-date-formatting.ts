#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTokenDateFormatting() {
  console.log('🔍 Verificando formato de fecha en tokens...\n');

  // Verificar uno de los tokens que actualizamos
  const token = await prisma.reusableToken.findUnique({
    where: { id: 'rt_E6E60B5F92F4AA13' },
    select: {
      id: true,
      expiresAt: true
    }
  });

  if (token) {
    console.log('📅 Fecha en base de datos (ISO):', token.expiresAt.toISOString());
    console.log('📅 Fecha en base de datos (UTC):', token.expiresAt.toUTCString());
    console.log('📅 Fecha en base de datos (local):', token.expiresAt.toString());

    // Simular cómo se muestra en la UI
    const uiFormatted = new Date(token.expiresAt).toLocaleDateString('es-ES');
    console.log('📅 Fecha en UI (es-ES):', uiFormatted);

    // Verificar zona horaria
    console.log('📅 Zona horaria del sistema:', Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Verificar si hay conversión de zona horaria
    const utcDate = new Date(token.expiresAt.getTime() + (token.expiresAt.getTimezoneOffset() * 60000));
    console.log('📅 Fecha convertida a UTC:', utcDate.toISOString());

    const localFormatted = utcDate.toLocaleDateString('es-ES');
    console.log('📅 Fecha UTC en UI (es-ES):', localFormatted);

  } else {
    console.log('❌ Token no encontrado');
  }

  await prisma.$disconnect();
}

checkTokenDateFormatting();