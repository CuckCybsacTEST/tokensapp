import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTables() {
  console.log("🌱 Seeding tables...");

  const tables = await Promise.all([
    prisma.table.upsert({
      where: { number: 1 },
      update: {},
      create: {
        number: 1,
        name: "Terraza 01",
        zone: "Terraza",
        capacity: 4,
        qrCode: "table-01",
      },
    }),
    prisma.table.upsert({
      where: { number: 2 },
      update: {},
      create: {
        number: 2,
        name: "Terraza 02",
        zone: "Terraza",
        capacity: 6,
        qrCode: "table-02",
      },
    }),
    prisma.table.upsert({
      where: { number: 3 },
      update: {},
      create: {
        number: 3,
        name: "VIP 01",
        zone: "VIP",
        capacity: 8,
        qrCode: "vip-01",
      },
    }),
    prisma.table.upsert({
      where: { number: 4 },
      update: {},
      create: {
        number: 4,
        name: "Barra 01",
        zone: "Barra",
        capacity: 2,
        qrCode: "bar-01",
      },
    }),
    prisma.table.upsert({
      where: { number: 5 },
      update: {},
      create: {
        number: 5,
        name: "Salón Principal 01",
        zone: "Principal",
        capacity: 6,
        qrCode: "main-01",
      },
    }),
  ]);

  console.log("✅ Tables created:", tables.length);
  console.log("🎉 Tables seeding completed!");
}

seedTables()
  .catch((e) => {
    console.error("❌ Error seeding tables:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
