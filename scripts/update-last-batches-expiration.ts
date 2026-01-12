import { prisma } from '../src/lib/prisma';
import { DateTime } from 'luxon';

async function main() {
  // 1. Obtener los lotes del 6 al 10 (saltando los primeros 5 ya actualizados)
  const batches = await prisma.batch.findMany({
    skip: 5,
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, description: true, createdAt: true }
  });

  console.log(`Actualizando tokens de los últimos ${batches.length} lotes...`);

  for (const batch of batches) {
    console.log(`Procesando lote: ${batch.description || batch.id} (${batch.createdAt.toISOString()})`);
    
    // 2. Actualizar tokens que no han sido canjeados y que expiran entre las 23:00 y 01:00 (margen de error)
    // Para simplificar, si el usuario quiere que los tokens duren hasta las 3AM, 
    // desplazamos cualquier token que expire a la medianoche (05:00 UTC aprox) a las 03:00 (08:00 UTC).
    
    // Obtenemos una muestra para ver qué tenemos
    const sample = await prisma.token.findFirst({
        where: { batchId: batch.id },
        select: { expiresAt: true }
    });

    if (sample) {
        const currentExp = DateTime.fromJSDate(sample.expiresAt).setZone('America/Lima');
        console.log(`Ejemplo de expiración actual: ${currentExp.toISO()}`);
        
        // Si termina en 23:59:59 (aprox), lo movemos a las 03:00 del día siguiente
        if (currentExp.hour === 23 && currentExp.minute === 59) {
            const newExp = currentExp.startOf('day').plus({ days: 1, hours: 3 }).minus({ milliseconds: 1 });
            console.log(`-> Moviendo a: ${newExp.toISO()}`);

            const result = await prisma.token.updateMany({
                where: { 
                    batchId: batch.id,
                    redeemedAt: null
                },
                data: {
                    expiresAt: newExp.toJSDate()
                }
            });
            console.log(`Cantidad actualizada: ${result.count}`);
        } else {
            console.log(`No parece ser un lote de medianoche (hour=${currentExp.hour}). Saltando actualización automática para evitar errores.`);
        }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
