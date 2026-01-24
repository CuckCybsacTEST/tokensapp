const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== MusicOrders ===");
  const orders = await prisma.musicOrder.findMany({ take: 10, orderBy: { createdAt: "desc" } });
  console.log(JSON.stringify(orders, null, 2));
  console.log(`Total orders: ${orders.length}`);

  console.log("\n=== MusicRateLimit ===");
  const limits = await prisma.musicRateLimit.findMany({ take: 5 });
  console.log(JSON.stringify(limits, null, 2));

  console.log("\n=== MusicSystemConfig ===");
  const config = await prisma.musicSystemConfig.findFirst();
  console.log(JSON.stringify(config, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
