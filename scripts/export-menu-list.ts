import { PrismaClient } from "@prisma/client";
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log("Conectando a la base de datos...");
  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: true,
    },
    orderBy: [
      { category: { order: 'asc' } },
      { order: 'asc' }
    ]
  });

  console.log(`Se encontraron ${products.length} productos.`);

  let content = "# Lista de Productos del Menú\n\n";
  content += `Generado el: ${new Date().toLocaleString()}\n\n`;

  // Group by category
  const grouped = products.reduce((acc, product) => {
    const catName = product.category.name;
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(product);
    return acc;
  }, {} as Record<string, typeof products>);

  for (const [category, items] of Object.entries(grouped)) {
    content += `## ${category}\n\n`;
    content += `| Producto | Descripción | Precio (S/.) | Variantes |\n`;
    content += `| --- | --- | --- | --- |\n`;
    
    for (const item of items) {
      const variantsStr = item.variants.length > 0 
        ? item.variants.map(v => `${v.name} (x${v.multiplier})`).join(', ') 
        : '-';
      
      // Escape pipes in description
      const description = (item.description || '-').replace(/\|/g, '\\|').replace(/\n/g, ' ');
      
      content += `| ${item.name} | ${description} | S/. ${item.price.toFixed(2)} | ${variantsStr} |\n`;
    }
    content += `\n`;
  }

  fs.writeFileSync('menu-products.md', content);
  console.log('Archivo menu-products.md creado exitosamente.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
