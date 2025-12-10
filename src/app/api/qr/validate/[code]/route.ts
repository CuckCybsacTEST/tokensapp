import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySignature, prepareQrDataForSignature } from '@/lib/qr-custom';

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const { code } = params;

    // Buscar QR en base de datos
    const customQr = await (prisma as any).customQr.findUnique({
      where: { code }
    });

    if (!customQr) {
      return NextResponse.json({ error: 'QR no encontrado' }, { status: 404 });
    }

    // Verificar si está activo
    if (!customQr.isActive) {
      return NextResponse.json({ error: 'QR inactivo' }, { status: 403 });
    }

    // Verificar expiración
    const now = new Date();
    if (customQr.expiresAt && customQr.expiresAt < now) {
      return NextResponse.json({ error: 'QR expirado' }, { status: 403 });
    }

    // Verificar si ya fue redimido
    if (customQr.redeemedAt) {
      return NextResponse.json({ error: 'QR ya redimido' }, { status: 403 });
    }

    // Verificar firma HMAC - usar exactamente los mismos campos que en la generación
    const qrData = prepareQrDataForSignature({
      customerName: customQr.customerName,
      customerWhatsapp: customQr.customerWhatsapp,
      customerDni: customQr.customerDni,
      customerPhrase: customQr.customerPhrase,
      customData: customQr.customData,
      theme: customQr.theme
    });

    const isValidSignature = verifySignature(customQr.code, qrData, customQr.signature);

    if (!isValidSignature) {
      return NextResponse.json({ error: 'QR inválido' }, { status: 403 });
    }

    // QR válido - devolver datos
    return NextResponse.json({
      qr: {
        id: customQr.id,
        customerName: customQr.customerName,
        customerWhatsapp: customQr.customerWhatsapp,
        customerDni: customQr.customerDni,
        customerPhrase: customQr.customerPhrase,
        customData: customQr.customData,
        theme: customQr.theme,
        qrColor: customQr.qrColor,
        backgroundColor: customQr.backgroundColor,
        imageUrl: customQr.imageUrl,
        originalImageUrl: customQr.originalImageUrl,
        imageMetadata: customQr.imageMetadata,
        code: customQr.code,
        isActive: customQr.isActive,
        expiresAt: customQr.expiresAt?.toISOString(),
        redeemedAt: customQr.redeemedAt?.toISOString(),
        createdAt: customQr.createdAt.toISOString()
      }
    });

  } catch (error: any) {
    console.error('[API QR Validate] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}