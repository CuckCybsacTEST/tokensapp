const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  try {
    await p.printTemplate.create({
      data: {
        id: 'default',
        name: 'Default template',
        filePath: 'public/templates/default.png',
        meta: JSON.stringify({
          qr: { xMm: 150, yMm: 230, widthMm: 30, rotationDeg: 0 },
          dpi: 300,
          layout: { cols: 2, rows: 4, marginMm: 5, spacingMm: 3 },
        }),
      },
    });
    console.log('seed ok');
  } catch (e) {
    if (e && e.code === 'P2002') console.log('already exists');
    else console.error(e);
  } finally {
    await p.$disconnect();
  }
})();
