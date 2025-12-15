// Script para actualizar fechas de expiración de QR codes personalizados
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetDate = new Date('2025-12-22T23:59:59.000Z'); // 22 de diciembre 2025 23:59:59 UTC

  console.log('Actualizando fechas de expiración de QR codes personalizados...');

  // Primero verificar si existe el código específico mencionado
  const specificQr = await prisma.customQr.findUnique({
    where: { code: 'C1ED7C2BDD9C9CEE7C1289EDD571FFFE' }
  });

  if (specificQr) {
    console.log(`QR encontrado: ${specificQr.code} - Cliente: ${specificQr.customerName}`);
    console.log(`Fecha actual de expiración: ${specificQr.expiresAt?.toISOString() || 'Sin fecha'}`);
  } else {
    console.log('El código específico no fue encontrado. Verificando todos los QR codes...');
  }

  // Obtener estadísticas de QR codes
  const totalQrs = await prisma.customQr.count();
  const activeQrs = await prisma.customQr.count({ where: { isActive: true } });
  const expiredQrs = await prisma.customQr.count({
    where: {
      expiresAt: { lt: new Date() },
      isActive: true
    }
  });

  console.log(`\nEstadísticas actuales:`);
  console.log(`Total QR codes: ${totalQrs}`);
  console.log(`Activos: ${activeQrs}`);
  console.log(`Expirados: ${expiredQrs}`);

  // Actualizar todos los QR codes activos para que expiren el 22 de diciembre
  const updateResult = await prisma.customQr.updateMany({
    where: {
      isActive: true,
      revokedAt: null // No actualizar QR revocados
    },
    data: {
      expiresAt: targetDate
    }
  });

  console.log(`\n✅ Actualizados ${updateResult.count} QR codes personalizados`);

  // Verificar algunos ejemplos
  console.log('\n=== VERIFICACIÓN ===');
  const updatedQrs = await prisma.customQr.findMany({
    where: {
      isActive: true,
      revokedAt: null
    },
    select: {
      code: true,
      customerName: true,
      expiresAt: true
    },
    take: 5
  });

  console.log('Ejemplos de QR codes actualizados:');
  updatedQrs.forEach(qr => {
    console.log(`${qr.code}: ${qr.customerName} - Expira: ${qr.expiresAt?.toISOString()}`);
  });

  // Verificar el específico si existe
  if (specificQr) {
    const updatedSpecific = await prisma.customQr.findUnique({
      where: { code: 'C1ED7C2BDD9C9CEE7C1289EDD571FFFE' },
      select: { code: true, expiresAt: true, customerName: true }
    });
    console.log(`\nCódigo específico actualizado:`);
    console.log(`${updatedSpecific?.code}: ${updatedSpecific?.customerName} - Expira: ${updatedSpecific?.expiresAt?.toISOString()}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());