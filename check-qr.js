import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCustomQr() {
  try {
    const qr = await prisma.customQr.findUnique({
      where: { code: 'BAE259E4433634059D50DFE8D5A6430E' }
    });

    if (qr) {
      console.log('CustomQr encontrado:');
      console.log({
        id: qr.id,
        code: qr.code,
        expiresAt: qr.expiresAt,
        batchId: qr.batchId,
        campaignName: qr.campaignName,
        theme: qr.theme,
        isActive: qr.isActive
      });
    } else {
      console.log('CustomQr no encontrado con ese código');
    }

    // Check if there are others with same batch or campaign
    if (qr?.batchId) {
      const batchQrs = await prisma.customQr.findMany({
        where: { batchId: qr.batchId },
        select: { id: true, code: true, expiresAt: true, campaignName: true }
      });
      console.log(`Otros QRs en el mismo batch (${qr.batchId}):`, batchQrs);
    }

    if (qr?.campaignName) {
      const campaignQrs = await prisma.customQr.findMany({
        where: { campaignName: qr.campaignName },
        select: { id: true, code: true, expiresAt: true, batchId: true }
      });
      console.log(`Otros QRs en la misma campaña (${qr.campaignName}):`, campaignQrs);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomQr();