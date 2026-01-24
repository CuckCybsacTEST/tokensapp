const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Limpiar rate limits para pruebas
  const deleted = await prisma.musicRateLimit.deleteMany({});
  console.log(`Eliminados ${deleted.count} registros de rate limit`);
  
  // Reducir cooldown a 0 para pruebas
  const updated = await prisma.musicSystemConfig.updateMany({
    data: {
      cooldownMinutes: 0,
      freeLimitPerHour: 100, // Aumentar límite para pruebas
    }
  });
  console.log(`Configuración actualizada: cooldown=0, freeLimitPerHour=100`);
  
  // Mostrar nueva config
  const config = await prisma.musicSystemConfig.findFirst();
  console.log("\nNueva configuración:");
  console.log(JSON.stringify(config, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
