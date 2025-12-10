import { PrismaClient } from '@prisma/client';
import { generateSignature } from '../src/lib/qr-custom';

async function regenerateQrSignatures() {
  const prisma = new PrismaClient();

  try {
    console.log('🔄 Regenerando firmas de QR existentes...');

    const qrs = await prisma.customQr.findMany();
    console.log(`📊 Encontrados ${qrs.length} QR para procesar`);

    let updated = 0;
    let errors = 0;

    for (const qr of qrs) {
      try {
        // Usar exactamente los mismos datos que en la validación
        const qrData = {
          customerName: qr.customerName,
          customerWhatsapp: qr.customerWhatsapp,
          customerPhrase: qr.customerPhrase,
          customData: qr.customData,
          theme: qr.theme,
          createdAt: qr.createdAt.toISOString()
        };

        const newSignature = generateSignature(qr.code, qrData);

        if (newSignature !== qr.signature) {
          await prisma.customQr.update({
            where: { id: qr.id },
            data: { signature: newSignature }
          });
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error procesando QR ${qr.code}:`, error);
        errors++;
      }
    }

    console.log(`✅ Firmas actualizadas: ${updated}`);
    if (errors > 0) {
      console.log(`⚠️ Errores: ${errors}`);
    }

  } catch (error) {
    console.error('💥 Error general:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateQrSignatures();