#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function fixDni() {
  try {
    const result = await prisma.ticketPurchase.updateMany({
      where: { customerDni: null },
      data: { customerDni: '12345678' }
    });

    console.log(`✅ Actualizados ${result.count} registros con DNI válido`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDni();