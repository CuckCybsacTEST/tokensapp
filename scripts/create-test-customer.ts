#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestCustomer() {
  try {
    console.log('🧪 Creando cliente de prueba...');

    const customer = await prisma.customer.upsert({
      where: { dni: '12345678' },
      update: {},
      create: {
        dni: '12345678',
        name: 'Cliente Prueba',
        email: 'test@example.com',
        phone: '999999999',
        whatsapp: '999999999',
        birthday: new Date('1990-01-01'),
        membershipLevel: 'BRONZE',
        points: 0,
        totalSpent: 0,
        visitCount: 0,
        isActive: true
      }
    });

    console.log('✅ Cliente creado:', customer);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCustomer();