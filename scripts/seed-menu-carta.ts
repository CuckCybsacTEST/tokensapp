import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductData {
  name: string;
  price: number;
  description?: string;
}

interface CategoryData {
  name: string;
  description?: string;
  products: ProductData[];
}

const menuData: CategoryData[] = [
  {
    name: 'WHISKY',
    products: [
      { name: 'JW Blue Label', price: 1200.00 },
      { name: 'JW Green Label', price: 250.00, description: 'Copa: S/ 30.00' },
      { name: 'JW Gold Label', price: 240.00, description: 'Copa: S/ 30.00' },
      { name: 'Jack Daniel\'s Fire', price: 200.00, description: 'Copa: S/ 30.00' },
      { name: 'Jack Daniel\'s Apple', price: 180.00, description: 'Copa: S/ 25.00' },
      { name: 'Jack Daniel\'s Honey', price: 180.00, description: 'Copa: S/ 25.00' },
      { name: 'Jack Daniel\'s', price: 180.00, description: 'Copa: S/ 25.00' },
      { name: 'Chivas Regal 12 años', price: 160.00, description: 'Copa: S/ 25.00' },
      { name: 'JW Double Black', price: 160.00, description: 'Copa: S/ 25.00' },
      { name: 'JW Black Label', price: 140.00, description: 'Copa: S/ 20.00' },
      { name: 'Ballantine\'s', price: 120.00, description: 'Copa: S/ 20.00' },
      { name: 'JW Red Label', price: 100.00 },
    ],
  },
  {
    name: '🍾 GIN',
    products: [
      { name: 'Hendricks', price: 180.00 },
      { name: 'Tanqueray', price: 160.00 },
      { name: 'Beefeater', price: 100.00 },
    ],
  },
  {
    name: '🍷 VINO',
    products: [
      { name: 'Tabernero Borgoña', price: 60.00 },
      { name: 'Tabernero Rosé', price: 60.00 },
      { name: 'Queirolo Borgoña', price: 50.00 },
      { name: 'Queirolo Rosé', price: 50.00 },
      { name: 'Queirolo Magdalena', price: 50.00 },
    ],
  },
  {
    name: '🍸 VODKA',
    products: [
      { name: 'Hpnotiq', price: 200.00 },
      { name: 'Nuno', price: 180.00 },
      { name: 'Smirnoff', price: 100.00 },
      { name: 'Absolut Sabores', price: 90.00 },
      { name: 'Absolut Clásicos', price: 90.00 },
      { name: 'Sky', price: 80.00 },
      { name: 'Russkaya 750 ml', price: 60.00 },
      { name: 'Russkaya Clasic', price: 60.00 },
    ],
  },
  {
    name: '🥃 LICOR',
    products: [
      { name: 'Jägermeister', price: 120.00 },
      { name: 'Baileys', price: 120.00 },
    ],
  },
  {
    name: '🍶 PISCO',
    products: [
      { name: 'Portón Acholado / Quebranta', price: 180.00 },
      { name: 'Viejo Tonel Quebranta/Acholado', price: 100.00 },
      { name: 'Tabernero Acholado', price: 90.00 },
      { name: 'Tabernero Quebranta', price: 80.00 },
      { name: 'Santiago Queirolo Acholado', price: 70.00 },
      { name: 'Santiago Queirolo Quebranta', price: 60.00 },
    ],
  },
  {
    name: '🥃 RON',
    products: [
      { name: 'Zacapa Centenario 23 años', price: 250.00 },
      { name: 'Ron Barceló Imperial', price: 220.00 },
      { name: 'Kraken', price: 150.00 },
      { name: 'Habana Club Añejo Reserva 750 ml', price: 80.00 },
      { name: 'Habana Club Añejo Especial 750 ml', price: 80.00 },
      { name: 'Santa Teresa', price: 100.00 },
      { name: 'Flor de Caña 12 años 750 ml', price: 120.00 },
      { name: 'Flor de Caña 7 años 750 ml', price: 100.00 },
      { name: 'Flor de Caña 5 años 750 ml', price: 90.00 },
      { name: 'Flor de Caña 4 años 750 ml', price: 80.00 },
      { name: 'Bacardi Superior 1 lt', price: 100.00 },
      { name: 'Bacardi Añejo 1 lt', price: 100.00 },
      { name: 'Kingston 62 (750 ml)', price: 60.00 },
      { name: 'Cartavio Black 1 lt', price: 80.00 },
      { name: 'Cartavio Superior 1 lt', price: 80.00 },
      { name: 'Cartavio Superior 750 ml', price: 50.00 },
    ],
  },
  {
    name: '🥃 TEQUILA',
    products: [
      { name: 'Tequila Rubio Don Julio', price: 190.00 },
      { name: 'Tequila Black José Cuervo', price: 200.00 },
      { name: 'Tequila Rubio José Cuervo', price: 100.00 },
      { name: 'Tequila Blanco José Cuervo', price: 100.00, description: 'Shot: S/ 12.00' },
    ],
  },
  {
    name: '🍺 CERVEZAS PERSONALES',
    products: [
      { name: 'Artesanal Dorcher', price: 15.00 },
      { name: 'Corona 350 ml', price: 9.00 },
      { name: 'Heineken', price: 9.00 },
      { name: 'Cusqueña Trigo', price: 9.00 },
      { name: 'Cusqueña Negra', price: 9.00 },
      { name: 'Cusqueña Rubia', price: 9.00 },
      { name: 'Pilsen', price: 9.00 },
      { name: 'Cristal', price: 9.00 },
      { name: 'Budweiser', price: 9.00 },
      { name: 'Cuzqueña Trigo 610 ml', price: 15.00 },
    ],
  },
  {
    name: '🥤 BEBIDAS',
    products: [
      { name: 'Coca Cola 3 lt', price: 20.00 },
      { name: 'Sprite 3 lt', price: 20.00 },
      { name: 'Ginger Ale', price: 20.00 },
      { name: 'Guaraná 3 lt', price: 20.00 },
      { name: 'Red Bull', price: 15.00 },
      { name: 'Monster', price: 15.00 },
      { name: 'Agua Tónica', price: 12.00 },
      { name: 'Coca Cola Guaraná (botellita)', price: 4.00 },
      { name: 'Agua de mesa 1/2 lt', price: 3.00 },
    ],
  },
  {
    name: 'ESPECIALES KTDral',
    products: [
      { name: 'Cóctel KTDral', price: 19.00, description: '1 Lt: S/ 38.00' },
      { name: 'Sour KTDral', price: 19.00, description: '1 Lt: S/ 40.00' },
      { name: 'Crema de Cerveza KTDral', price: 18.00, description: '1 Lt: S/ 38.00' },
    ],
  },
  {
    name: 'JARRITAS DE CASA',
    products: [
      { name: 'Super Caliente Antigripal', price: 25.00 },
      { name: 'Antigripal Hot', price: 25.00 },
      { name: 'De Altura', price: 25.00 },
      { name: 'Andino', price: 25.00 },
      { name: 'Minero', price: 25.00 },
      { name: 'Gitano', price: 25.00 },
      { name: 'Mora Azul', price: 25.00 },
      { name: 'Charapita', price: 25.00 },
      { name: 'Pitufo', price: 25.00 },
      { name: 'Chechichos', price: 25.00 },
      { name: 'Apple Green', price: 25.00 },
    ],
  },
  {
    name: 'CÓCTELES - DULCES',
    products: [
      { name: 'Algarrobina', price: 20.00, description: '1 Lt: S/ 42.00' },
      { name: 'Hawaiana Azul', price: 18.00, description: '1 Lt: S/ 45.00' },
      { name: 'Tequila Sunrise', price: 18.00, description: '1 Lt: S/ 45.00' },
      { name: 'Daiquiri de Fresa', price: 15.00, description: '1 Lt: S/ 40.00' },
      { name: 'Jager Boom', price: 25.00 },
      { name: 'Machupicchu', price: 15.00, description: '1 Lt: S/ 35.00' },
      { name: 'KTDral Boom (Torre)', price: 30.00 },
      { name: 'Pantera Rosa Margarita Corona', price: 0 }, // No price listed
    ],
  },
  {
    name: 'CÓCTELES - Tropicales',
    products: [
      { name: 'Laguna Azul', price: 15.00, description: '1 Lt: S/ 35.00' },
      { name: 'Piña Colada', price: 18.00, description: '1 Lt: S/ 40.00' },
    ],
  },
  {
    name: 'CÓCTELES - EXÓTICOS',
    products: [
      { name: 'Sangría Alemana', price: 18.00, description: '1 Lt: S/ 40.00' },
      { name: 'Sangría Clásica', price: 15.00, description: '1 Lt: S/ 30.00' },
      { name: 'Amor en Llamas', price: 17.00, description: '1 Lt: S/ 40.00' },
      { name: 'Matador', price: 17.00, description: '1 Lt: S/ 40.00' },
    ],
  },
  {
    name: 'CÓCTELES - SECOS',
    products: [
      { name: 'Negroni', price: 0 }, // No price
      { name: 'Manhatan', price: 0 },
      { name: 'Capitan', price: 0 },
      { name: 'Martini', price: 0 },
    ],
  },
];

async function seedMenu() {
  for (const categoryData of menuData) {
    let category = await prisma.category.findFirst({
      where: { name: categoryData.name },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: categoryData.name,
          description: categoryData.description,
        },
      });
    }

    for (const productData of categoryData.products) {
      await prisma.product.create({
        data: {
          name: productData.name,
          price: productData.price,
          description: productData.description,
          categoryId: category.id,
        },
      });
    }
  }

  console.log('Menu seeded successfully');
}

seedMenu()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });