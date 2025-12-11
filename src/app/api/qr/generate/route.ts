export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateQrCode,
  generateSignature,
  generateCustomQrDataUrl,
  generateRedeemUrl,
  calculateExpiryDate,
  isValidName,
  isValidPeruvianWhatsapp,
  isValidPeruvianDni,
  normalizeWhatsapp,
  prepareQrDataForSignature,
  type QrTheme
} from '@/lib/qr-custom';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // Obtener política activa
    const activePolicy = await (prisma as any).customQrPolicy.findFirst({
      where: { isActive: true }
    });

    if (!activePolicy) {
      return NextResponse.json(
        { ok: false, error: 'No hay política activa configurada. Contacta al administrador.' },
        { status: 500 }
      );
    }

    // Extraer y validar datos
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const customerWhatsapp = typeof body.customerWhatsapp === 'string' ? body.customerWhatsapp.trim() : '';
    const customerDni = typeof body.customerDni === 'string' ? body.customerDni.trim() : '';
    const customerPhrase = typeof body.customerPhrase === 'string' ? body.customerPhrase.trim() : '';
    const customData = typeof body.customData === 'string' ? body.customData.trim() : '';
    const theme = (typeof body.theme === 'string' ? body.theme : 'default') as QrTheme;
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : null;
    const originalImageUrl = typeof body.originalImageUrl === 'string' ? body.originalImageUrl.trim() : null;
    const imageMetadata = body.imageMetadata || null;

    // Validaciones
    if (!isValidName(customerName)) {
      return NextResponse.json(
        { ok: false, error: 'Nombre inválido. Debe tener al menos nombre y apellido.' },
        { status: 400 }
      );
    }

    if (!isValidPeruvianWhatsapp(customerWhatsapp)) {
      return NextResponse.json(
        { ok: false, error: 'Número de WhatsApp inválido. Debe ser un número peruano válido.' },
        { status: 400 }
      );
    }

    if (!isValidPeruvianDni(customerDni)) {
      return NextResponse.json(
        { ok: false, error: 'DNI inválido. Debe tener exactamente 8 dígitos.' },
        { status: 400 }
      );
    }

    // Verificar unicidad del DNI si la política lo requiere
    if (activePolicy.requireUniqueDni && customerDni) {
      const existingDniQr = await (prisma as any).customQr.findFirst({
        where: {
          customerDni: customerDni,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (existingDniQr) {
        return NextResponse.json(
          { ok: false, error: 'Este DNI ya tiene un QR activo. Cada DNI puede tener solo un QR válido a la vez.' },
          { status: 409 }
        );
      }
    }

    // Verificar unicidad del nombre + whatsapp (prevenir spam)
    const existingQr = await (prisma as any).customQr.findFirst({
      where: {
        customerName: customerName.toLowerCase(),
        customerWhatsapp: normalizeWhatsapp(customerWhatsapp),
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (existingQr) {
      return NextResponse.json(
        { ok: false, error: 'Ya tienes un QR activo. Espera a que expire o contacta al administrador.' },
        { status: 409 }
      );
    }

    // Generar código único
    let code: string;
    let codeExists = true;
    let attempts = 0;

    do {
      code = generateQrCode();
      const existing = await (prisma as any).customQr.findUnique({
        where: { code }
      });
      codeExists = !!existing;
      attempts++;
    } while (codeExists && attempts < 10);

    if (codeExists) {
      return NextResponse.json(
        { ok: false, error: 'Error interno. Inténtalo nuevamente.' },
        { status: 500 }
      );
    }

    // Preparar datos para firma usando función centralizada
    const qrData = prepareQrDataForSignature({
      customerName,
      customerWhatsapp: normalizeWhatsapp(customerWhatsapp),
      customerDni: customerDni || null,
      customerPhrase: customerPhrase || null,
      customData: customData || null,
      theme
    });

    // Generar firma HMAC
    const signature = generateSignature(code, qrData);

    // Calcular expiración basada en la política
    const expiresAt = calculateExpiryDate(activePolicy.defaultExpiryDays || 30);

    // Crear QR en base de datos
    const customQr = await (prisma as any).customQr.create({
      data: {
        code,
        customerName,
        customerWhatsapp: normalizeWhatsapp(customerWhatsapp),
        customerDni: customerDni || null,
        customerPhrase: customerPhrase || null,
        customData: customData || null,
        theme,
        imageUrl,
        originalImageUrl,
        imageMetadata: imageMetadata ? JSON.stringify(imageMetadata) : null,
        signature,
        expiresAt,
        batchId: activePolicy.defaultBatchId || null,
        ipAddress: req.headers.get('x-forwarded-for') ||
                  req.headers.get('x-real-ip') ||
                  'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        metadata: JSON.stringify({
          theme,
          policyId: activePolicy.id,
          policyName: activePolicy.name,
          userAgent: req.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        })
      }
    });

    // Generar URL de redención
    const redeemUrl = generateRedeemUrl(code);

    // Generar imagen QR
    const qrDataUrl = await generateCustomQrDataUrl(redeemUrl, theme);

    return NextResponse.json({
      ok: true,
      code: customQr.code,
      qrDataUrl,
      redeemUrl,
      expiresAt: expiresAt.toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      theme,
      customerName: customQr.customerName
    });

  } catch (error: any) {
    console.error('[API] Error generando QR personalizado:', error);

    // Manejar errores específicos de base de datos
    if (error.code === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'Ya existe un QR con estos datos. Inténtalo con información diferente.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor. Inténtalo nuevamente.' },
      { status: 500 }
    );
  }
}