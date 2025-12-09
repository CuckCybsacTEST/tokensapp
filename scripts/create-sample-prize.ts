#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSamplePrize() {
  try {
    const existing = await prisma.reusablePrize.findFirst({
      where: { key: 'TEST_PRIZE' }
    });

    if (existing) {
      console.log('El premio de prueba ya existe');
      return;
    }

    const prize = await prisma.reusablePrize.create({
      data: {
        label: 'Premio de Prueba',
        key: 'TEST_PRIZE',
        color: '#FF6B6B',
        description: 'Premio de prueba para tokens reusables'
      }
    });

    console.log('✅ Premio de prueba creado exitosamente:', prize);
  } catch (error) {
    console.error('❌ Error creando premio de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSamplePrize();