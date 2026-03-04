import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTokenData() {
  try {
    const token = await prisma.token.findUnique({
      where: { id: 'rt_226969BEE07D0462' },
      include: {
        prize: true,
        batch: true,
        assignedPrize: true
      }
    });

    if (token) {
      console.log('=== DATOS DEL TOKEN ===');
      console.log(`ID: ${token.id}`);
      console.log(`Creado: ${token.createdAt}`);
      console.log(`Expira: ${token.expiresAt}`);
      console.log(`Redimido: ${token.redeemedAt || 'No redimido'}`);
      console.log(`Revelado: ${token.revealedAt || 'No revelado'}`);
      console.log(`Entregado: ${token.deliveredAt || 'No entregado'}`);
      console.log(`Entregado por: ${token.deliveredByUserId || 'N/A'}`);
      console.log(`Nota de entrega: ${token.deliveryNote || 'N/A'}`);
      console.log(`Ingerido: ${token.ingestedAt}`);
      console.log(`Válido desde: ${token.validFrom || 'N/A'}`);
      console.log(`Usos máximos: ${token.maxUses || 'Ilimitado'}`);
      console.log(`Usos actuales: ${token.usedCount}`);
      console.log(`Inicio tiempo: ${token.startTime || 'N/A'}`);
      console.log(`Fin tiempo: ${token.endTime || 'N/A'}`);
      console.log(`Deshabilitado: ${token.disabled}`);
      console.log(`Firma: ${token.signature}`);
      console.log(`Versión firma: ${token.signatureVersion}`);

      console.log('\n=== PREMIO ===');
      console.log(`ID Premio: ${token.prizeId}`);
      console.log(`Clave: ${token.prize.key}`);
      console.log(`Etiqueta: ${token.prize.label}`);
      console.log(`Color: ${token.prize.color || 'N/A'}`);
      console.log(`Descripción: ${token.prize.description || 'N/A'}`);
      console.log(`Stock: ${token.prize.stock || 'Ilimitado'}`);
      console.log(`Activo: ${token.prize.active}`);
      console.log(`Emitidos total: ${token.prize.emittedTotal}`);
      console.log(`Último emitido: ${token.prize.lastEmittedAt || 'N/A'}`);
      console.log(`Reutilizable: ${token.prize.isReusable}`);

      console.log('\n=== BATCH ===');
      console.log(`ID Batch: ${token.batchId}`);
      console.log(`Descripción: ${token.batch.description || 'N/A'}`);
      console.log(`Creado por: ${token.batch.createdBy || 'N/A'}`);
      console.log(`Creado: ${token.batch.createdAt}`);
      console.log(`Fecha funcional: ${token.batch.functionalDate || 'N/A'}`);
      console.log(`URL estática: ${token.batch.staticTargetUrl || 'N/A'}`);
      console.log(`Reutilizable: ${token.batch.isReusable}`);

      if (token.assignedPrizeId) {
        console.log('\n=== PREMIO ASIGNADO ===');
        console.log(`ID Premio asignado: ${token.assignedPrizeId}`);
        console.log(`Clave: ${token.assignedPrize.key}`);
        console.log(`Etiqueta: ${token.assignedPrize.label}`);
        console.log(`Color: ${token.assignedPrize.color || 'N/A'}`);
        console.log(`Descripción: ${token.assignedPrize.description || 'N/A'}`);
        console.log(`Stock: ${token.assignedPrize.stock || 'Ilimitado'}`);
        console.log(`Activo: ${token.assignedPrize.active}`);
        console.log(`Emitidos total: ${token.assignedPrize.emittedTotal}`);
        console.log(`Último emitido: ${token.assignedPrize.lastEmittedAt || 'N/A'}`);
        console.log(`Reutilizable: ${token.assignedPrize.isReusable}`);
      } else {
        console.log('\n=== PREMIO ASIGNADO ===');
        console.log('Ningún premio asignado');
      }

      console.log('\n=== DATOS COMPLETOS (JSON) ===');
      console.log(JSON.stringify(token, null, 2));
    } else {
      console.log('❌ Token no encontrado con ID: rt_226969BEE07D0462');
    }
  } catch (error) {
    console.error('❌ Error al consultar el token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTokenData();