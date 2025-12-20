import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markFeaturedProducts() {
  console.log('🎯 Marcando productos destacados para optimización de imágenes...\n');

  // Ejemplos de productos a destacar por categoría
  const featuredProducts = [
    // Whisky - destacar los más premium
    { name: 'Jack Daniel\'s', categoryName: 'WHISKY' },
    { name: 'Chivas Regal 12', categoryName: 'WHISKY' },

    // Vinos - destacar los más vendidos
    { name: 'Casillero del Diablo', categoryName: '🍷 VINO' },

    // Cervezas - destacar las premium
    { name: 'Corona', categoryName: '🍺 CERVEZAS PERSONALES' },

    // Cocteles - destacar los más populares
    { name: 'Mojito', categoryName: 'CÓCTELES - Tropicales' },
    { name: 'Margarita', categoryName: 'CÓCTELES - Tropicales' },
    { name: 'Piña Colada', categoryName: 'CÓCTELES - Tropicales' },

    // Especiales - destacar todos
    { name: 'Especial KTDral', categoryName: 'ESPECIALES KTDral' },

    // Jarras - destacar las más grandes
    { name: 'Jarra Mediana', categoryName: 'JARRITAS DE CASA' },
    { name: 'Jarra Grande', categoryName: 'JARRITAS DE CASA' },
  ];

  let updatedCount = 0;

  for (const featured of featuredProducts) {
    try {
      // Primero encontrar la categoría
      const category = await prisma.category.findFirst({
        where: { name: featured.categoryName }
      });

      if (!category) {
        console.log(`⚠️  Categoría no encontrada: ${featured.categoryName}`);
        continue;
      }

      // Luego encontrar y actualizar el producto
      const product = await prisma.product.findFirst({
        where: {
          name: { contains: featured.name },
          categoryId: category.id
        }
      });

      if (product) {
        await prisma.product.update({
          where: { id: product.id },
          data: { featured: true }
        });
        console.log(`✅ ${featured.name} marcado como destacado`);
        updatedCount++;
      } else {
        console.log(`⚠️  Producto no encontrado: ${featured.name} en ${featured.categoryName}`);
      }
    } catch (error) {
      console.error(`❌ Error actualizando ${featured.name}:`, error);
    }
  }

  // Mostrar estadísticas finales
  const totalProducts = await prisma.product.count();
  const featuredCount = await prisma.product.count({ where: { featured: true } });
  const featuredWithImages = await prisma.product.count({
    where: { featured: true, image: { not: null } }
  });

  console.log(`\n📊 Estadísticas finales:`);
  console.log(`   Total productos: ${totalProducts}`);
  console.log(`   Productos destacados: ${featuredCount}`);
  console.log(`   Destacados con imagen: ${featuredWithImages}`);
  console.log(`   Ratio de imágenes: ${((featuredWithImages / totalProducts) * 100).toFixed(1)}%`);

  console.log(`\n🎉 ${updatedCount} productos marcados como destacados exitosamente!`);
  console.log(`💡 Ahora solo estos productos cargarán imágenes, optimizando el rendimiento.`);
}

markFeaturedProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());