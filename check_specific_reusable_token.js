import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getReusableTokenData() {
  try {
    const token = await prisma.reusableToken.findUnique({
      where: { id: 'rt_226969BEE07D0462' },
      include: {
        prize: true,
        group: true
      }
    });

    if (token) {
      console.log('=== DATOS DEL TOKEN REUTILIZABLE ===');
      console.log(`ID: ${token.id}`);
      console.log(`Creado: ${token.createdAt}`);
      console.log(`Expira: ${token.expiresAt}`);
      console.log(`Redimido: ${token.redeemedAt || 'No redimido'}`);
      console.log(`Entregado: ${token.deliveredAt || 'No entregado'}`);
      console.log(`Entregado por: ${token.deliveredByUserId || 'N/A'}`);
      console.log(`Nota de entrega: ${token.deliveryNote || 'N/A'}`);
      console.log(`Usos máximos: ${token.maxUses}`);
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
      console.log(`Activo: ${token.prize.active}`);

      if (token.groupId) {
        console.log('\n=== GRUPO ===');
        console.log(`ID Grupo: ${token.groupId}`);
        console.log(`Nombre: ${token.group.name}`);
        console.log(`Descripción: ${token.group.description || 'N/A'}`);
        console.log(`Color: ${token.group.color || 'N/A'}`);
      } else {
        console.log('\n=== GRUPO ===');
        console.log('Sin grupo asignado');
      }

      console.log('\n=== DATOS COMPLETOS (JSON) ===');
      console.log(JSON.stringify(token, null, 2));
    } else {
      console.log('❌ Token reutilizable no encontrado con ID: rt_226969BEE07D0462');
    }
  } catch (error) {
    console.error('❌ Error al consultar el token reutilizable:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getReusableTokenData();