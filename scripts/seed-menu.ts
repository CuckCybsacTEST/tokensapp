import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedMenu() {
  console.log("🌱 Seeding menu data...");

  // Crear categorías
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

  // Crear productos de ejemplo
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
      where: { id: "negroni" },
      update: {},
      create: {
        id: "negroni",
        name: "Negroni",
        description: "Gin, Campari y vermut rojo",
        price: 28.00,
        categoryId: "bebidas",
        order: 2,
      },
    }),
    prisma.product.upsert({
      where: { id: "malbec" },
      update: {},
      create: {
        id: "malbec",
        name: "Malbec Reserva",
        description: "Vino tinto argentino de alta calidad",
        price: 35.00,
        categoryId: "bebidas",
        order: 3,
      },
    }),

    // Comidas
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
      where: { id: "pasta" },
      update: {},
      create: {
        id: "pasta",
        name: "Pasta al Pesto",
        description: "Pasta fresca con salsa pesto, piñones y parmesano",
        price: 28.00,
        categoryId: "comidas",
        order: 2,
      },
    }),

    // Postres
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
    prisma.product.upsert({
      where: { id: "brownie" },
      update: {},
      create: {
        id: "brownie",
        name: "Brownie con Helado",
        description: "Brownie de chocolate con helado de vainilla",
        price: 16.00,
        categoryId: "postres",
        order: 2,
      },
    }),
  ]);

  console.log("✅ Products created:", products.length);
  console.log("🎉 Menu seeding completed!");
}

seedMenu()
  .catch((e) => {
    console.error("❌ Error seeding menu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
