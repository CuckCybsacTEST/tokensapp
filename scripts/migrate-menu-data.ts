import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateMenuData() {
  console.log('🚀 Iniciando migración de datos del menú...');

  try {
    // 1. Migrar precios de productos (price -> basePrice)
    console.log('📦 Migrando precios de productos...');
    const products = await prisma.product.findMany({
      where: { basePrice: null }
    });

    for (const product of products) {
      await prisma.product.update({
        where: { id: product.id },
        data: { basePrice: product.price }
      });
    }
    console.log(`✅ Migrados ${products.length} productos`);

    // 2. Migrar precios de order items (price -> unitPrice, calcular totalPrice)
    console.log('🛒 Migrando precios de items de pedido...');
    const orderItems = await prisma.orderItem.findMany({
      where: {
        OR: [
          { unitPrice: null },
          { totalPrice: null }
        ]
      }
    });

    for (const item of orderItems) {
      const unitPrice = item.price;
      const totalPrice = unitPrice * item.quantity;

      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          unitPrice,
          totalPrice
        }
      });
    }
    console.log(`✅ Migrados ${orderItems.length} items de pedido`);

    // 3. Crear unidades de medida básicas
    console.log('📏 Creando unidades de medida básicas...');
    const units = [
      { name: 'Unidad', symbol: 'u', type: 'count' },
      { name: 'Botella', symbol: 'btl', type: 'volume' },
      { name: 'Copa', symbol: 'copa', type: 'volume' },
      { name: 'Porción', symbol: 'pz', type: 'count' },
      { name: 'Kilogramo', symbol: 'kg', type: 'weight' },
      { name: 'Litro', symbol: 'L', type: 'volume' }
    ];

    await prisma.unitOfMeasure.createMany({
      data: units,
      skipDuplicates: true
    });
    console.log(`✅ Intentadas crear ${units.length} unidades de medida`);

    console.log('🎉 Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la migración
migrateMenuData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
