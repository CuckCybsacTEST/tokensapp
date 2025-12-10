import { PrismaClient } from '@prisma/client';
import { generateSignature, prepareQrDataForSignature } from './src/lib/qr-custom.ts';

const prisma = new PrismaClient();

async function fixQrSignatures() {
  try {
    // Get all custom QRs
    const qrs = await prisma.customQr.findMany();
    console.log(`Found ${qrs.length} QRs`);

    let fixed = 0;
    let alreadyValid = 0;

    for (const qr of qrs) {
      // Prepare data using new function
      const qrData = prepareQrDataForSignature({
        customerName: qr.customerName,
        customerWhatsapp: qr.customerWhatsapp,
        customerDni: qr.customerDni,
        customerPhrase: qr.customerPhrase,
        customData: qr.customData,
        theme: qr.theme
      });

      // Generate correct signature
      const correctSignature = generateSignature(qr.code, qrData);

      if (qr.signature !== correctSignature) {
        console.log(`Fixing QR ${qr.code}: old signature length ${qr.signature.length}, new length ${correctSignature.length}`);

        // Update the signature
        await prisma.customQr.update({
          where: { id: qr.id },
          data: { signature: correctSignature }
        });

        fixed++;
      } else {
        alreadyValid++;
      }
    }

    console.log(`Fixed ${fixed} QRs, ${alreadyValid} were already valid`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixQrSignatures();