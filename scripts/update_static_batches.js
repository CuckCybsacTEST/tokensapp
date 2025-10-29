const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Cambia el valor de targetUrl por el que corresponda a tu entorno
  const targetUrl = 'https://tusitio.com/static';
  // Selecciona los batches que deberían ser estáticos (ajusta el filtro si es necesario)
  const staticBatches = await prisma.batch.findMany({
    where: {
      staticTargetUrl: ''
    }
  });
  for (const batch of staticBatches) {
    await prisma.batch.update({
      where: { id: batch.id },
      data: { staticTargetUrl: targetUrl }
    });
    console.log(`Batch ${batch.id} actualizado a staticTargetUrl: ${targetUrl}`);
  }
  console.log('Actualización completada.');
}

main().catch(e => { console.error(e); process.exit(1); });
