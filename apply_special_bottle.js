const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applySpecialBottleRetroactively() {
  try {
    // Obtener configuración
    const config = await prisma.systemConfig.findFirst();
    if (!config?.wednesdaySpecialBottle) {
      console.log('No special bottle configured');
      return;
    }

    // Encontrar reservas que cumplan: miércoles, pack gratis, sin specialBottle
    const reservations = await prisma.birthdayReservation.findMany({
      where: {
        pack: {
          priceSoles: 0
        },
        specialBottle: null
      },
      include: { pack: true }
    });

    let updated = 0;
    for (const r of reservations) {
      if (r.date) {
        const day = r.date.getDay();
        if (day === 3) { // miércoles
          await prisma.birthdayReservation.update({
            where: { id: r.id },
            data: { specialBottle: config.wednesdaySpecialBottle }
          });
          updated++;
          console.log(`Updated reservation ${r.id} with special bottle`);
        }
      }
    }

    console.log(`Updated ${updated} reservations`);
  } finally {
    await prisma.$disconnect();
  }
}

applySpecialBottleRetroactively();