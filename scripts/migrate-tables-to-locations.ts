import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateTablesToLocations() {
  console.log('🚀 Iniciando migración de mesas a sistema jerárquico...');

  try {
    // 1. Crear las 5 ubicaciones principales
    const locations = [
      { name: 'General', type: 'DINING', order: 1 },
      { name: 'VIP', type: 'VIP', order: 2 },
      { name: 'Bar Abajo', type: 'BAR', order: 3 },
      { name: 'Bar Arriba 1', type: 'BAR', order: 4 },
      { name: 'Bar Arriba 2', type: 'BAR', order: 5 },
    ];

    console.log('📍 Creando ubicaciones...');
    for (const loc of locations) {
      const existing = await prisma.location.findFirst({
        where: { name: loc.name }
      });

      if (!existing) {
        await prisma.location.create({
          data: loc
        });
        console.log(`✅ Creada ubicación: ${loc.name}`);
      } else {
        console.log(`⏭️ Ubicación ya existe: ${loc.name}`);
      }
    }

    // 2. Migrar mesas existentes a ServicePoints
    console.log('🔄 Migrando mesas existentes...');
    const existingTables = await prisma.table.findMany();

    for (const table of existingTables) {
      // Determinar ubicación basada en zona existente
      let locationId: string;
      let type: 'TABLE' | 'BOX' | 'ZONE' = 'TABLE';

      if (table.zone?.toLowerCase().includes('vip')) {
        const vipLoc = await prisma.location.findFirst({ where: { name: 'VIP' } });
        locationId = vipLoc!.id;
        if (table.name?.toLowerCase().includes('box')) type = 'BOX';
      } else if (table.zone?.toLowerCase().includes('barra') || table.zone?.toLowerCase().includes('bar')) {
        // Asignar a Bar Abajo por defecto, se puede reasignar manualmente después
        const barLoc = await prisma.location.findFirst({ where: { name: 'Bar Abajo' } });
        locationId = barLoc!.id;
        type = 'ZONE'; // Las barras son zonas
      } else {
        // General por defecto
        const generalLoc = await prisma.location.findFirst({ where: { name: 'General' } });
        locationId = generalLoc!.id;
        if (table.name?.toLowerCase().includes('box')) type = 'BOX';
      }

      // Crear ServicePoint
      const servicePointNumber = table.zone ? `${table.zone}-${table.number}` : `General-${table.number}`;

      const existingSP = await prisma.servicePoint.findFirst({
        where: { number: servicePointNumber }
      });

      if (!existingSP) {
        await prisma.servicePoint.create({
          data: {
            locationId,
            number: servicePointNumber,
            name: table.name,
            type,
            capacity: table.capacity,
            active: table.active,
            qrCode: table.qrCode,
          }
        });
        console.log(`✅ Migrada mesa ${table.number} → ${servicePointNumber}`);
      } else {
        console.log(`⏭️ ServicePoint ya existe: ${servicePointNumber}`);
      }
    }

    // 3. Actualizar pedidos existentes para usar servicePointId
    console.log('🔗 Actualizando referencias de pedidos...');
    const orders = await prisma.order.findMany({
      include: { table: true }
    });

    for (const order of orders) {
      if (order.table) {
        // Encontrar el ServicePoint correspondiente
        const servicePoint = await prisma.servicePoint.findFirst({
          where: {
            OR: [
              { qrCode: order.table.qrCode },
              { name: order.table.name }
            ]
          }
        });

        if (servicePoint) {
          await prisma.order.update({
            where: { id: order.id },
            data: { servicePointId: servicePoint.id }
          });
          console.log(`✅ Actualizado pedido ${order.id} → servicePoint ${servicePoint.number}`);
        }
      }
    }

    console.log('🎉 Migración completada exitosamente!');
    console.log('📋 Resumen:');
    console.log(`   - Ubicaciones creadas: ${locations.length}`);
    console.log(`   - Mesas migradas: ${existingTables.length}`);
    console.log(`   - Pedidos actualizados: ${orders.length}`);

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  migrateTablesToLocations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { migrateTablesToLocations };