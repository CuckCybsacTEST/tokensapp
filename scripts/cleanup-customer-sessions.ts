#!/usr/bin/env tsx

/**
 * Script para limpiar sesiones de clientes expiradas
 * Se ejecuta periódicamente para mantener la base de datos limpia
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupExpiredSessions() {
  console.log('🧹 Iniciando limpieza de sesiones expiradas...');

  try {
    // Eliminar sesiones expiradas
    const expiredResult = await prisma.customerSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    console.log(`✅ Eliminadas ${expiredResult.count} sesiones expiradas`);

    // Opcional: Eliminar sesiones inactivas por más de 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const inactiveResult = await prisma.customerSession.deleteMany({
      where: {
        lastActivity: {
          lt: thirtyDaysAgo
        }
      }
    });

    console.log(`✅ Eliminadas ${inactiveResult.count} sesiones inactivas (>30 días)`);

    // Estadísticas
    const activeSessions = await prisma.customerSession.count({
      where: {
        expiresAt: {
          gt: new Date()
        }
      }
    });

    console.log(`📊 Sesiones activas restantes: ${activeSessions}`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar limpieza
cleanupExpiredSessions()
  .then(() => {
    console.log('🎉 Limpieza completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });