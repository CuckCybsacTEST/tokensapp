import { PrismaClient } from "@prisma/client";
import { uploadMenuImage, MENU_FOLDERS } from "../src/lib/supabase-server";

const prisma = new PrismaClient();

async function seedMenuWithImages() {
  console.log("🌱 Seeding menu with images...");

  try {
    // Crear categorías con imágenes
    const categories = await Promise.all([
      prisma.category.upsert({
        where: { id: "bebidas" },
        update: {},
        create: {
          id: "bebidas",
          name: "Bebidas",
          description: "Cócteles, vinos y bebidas refrescantes",
          icon: "🍸",
          order: 1,
        },
      }),
      prisma.category.upsert({
        where: { id: "comidas" },
        update: {},
        create: {
          id: "comidas",
          name: "Comidas",
          description: "Platos principales y entradas",
          icon: "🍽️",
          order: 2,
        },
      }),
      prisma.category.upsert({
        where: { id: "postres" },
        update: {},
        create: {
          id: "postres",
          name: "Postres",
          description: "Deliciosos postres y dulces",
          icon: "🍰",
          order: 3,
        },
      }),
    ]);

    console.log("✅ Categories created:", categories.length);

    // Crear productos con imágenes de ejemplo
    // Nota: En un entorno real, subirías imágenes reales desde archivos locales
    const products = await Promise.all([
      // Bebidas
      prisma.product.upsert({
        where: { id: "mojito" },
        update: {},
        create: {
          id: "mojito",
          name: "Mojito Clásico",
          description: "Ron blanco, menta fresca, azúcar, lima y soda",
          price: 25.00,
          categoryId: "bebidas",
          order: 1,
        },
      }),
      prisma.product.upsert({
        where: { id: "burger" },
        update: {},
        create: {
          id: "burger",
          name: "Burger Gourmet",
          description: "Carne de 200g, queso cheddar, lechuga, tomate y papas fritas",
          price: 32.00,
          categoryId: "comidas",
          order: 1,
        },
      }),
      prisma.product.upsert({
        where: { id: "tiramisu" },
        update: {},
        create: {
          id: "tiramisu",
          name: "Tiramisú",
          description: "Clásico postre italiano con café y mascarpone",
          price: 18.00,
          categoryId: "postres",
          order: 1,
        },
      }),
    ]);

    console.log("✅ Products created:", products.length);
    console.log("🎉 Menu seeding completed!");
    console.log("");
    console.log("💡 Para agregar imágenes:");
    console.log("1. Ve a /admin/menu");
    console.log("2. Edita un producto o categoría");
    console.log("3. Usa el campo 'Imagen' para subir archivos");
    console.log("4. Las imágenes se almacenan automáticamente en Supabase");

  } catch (error) {
    console.error("❌ Error seeding menu:", error);
    throw error;
  }
}

seedMenuWithImages()
  .catch((e) => {
    console.error("❌ Error seeding menu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });