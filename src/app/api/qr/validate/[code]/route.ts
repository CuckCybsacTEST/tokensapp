import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { prepareQrDataForSignature, verifySignature } from "@/lib/qr-custom";

function parseCustomData(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value) as { maxUses?: number; usedCount?: number };
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const { code } = params;

    const customQr = await (prisma as any).customQr.findUnique({
      where: { code },
    });

    if (!customQr) {
      return NextResponse.json({ error: "QR no encontrado" }, { status: 404 });
    }

    if (!customQr.isActive) {
      return NextResponse.json({ error: "QR inactivo" }, { status: 403 });
    }

    const now = new Date();
    if (customQr.expiresAt && customQr.expiresAt < now) {
      return NextResponse.json({ error: "QR expirado" }, { status: 403 });
    }

    if (customQr.redeemedAt) {
      return NextResponse.json({ error: "QR ya redimido" }, { status: 403 });
    }

    const qrData = prepareQrDataForSignature({
      customerName: customQr.customerName,
      customerWhatsapp: customQr.customerWhatsapp,
      customerDni: customQr.customerDni,
      customerPhrase: customQr.customerPhrase,
      customData: customQr.customData,
      theme: customQr.theme,
    });

    const isValidSignature = verifySignature(customQr.code, qrData, customQr.signature);
    if (!isValidSignature) {
      return NextResponse.json({ error: "QR inválido" }, { status: 403 });
    }

    const metadata = parseCustomData(customQr.customData);
    const maxUses = Math.max(1, Number(metadata.maxUses || metadata.usedCount || 1));
    const usedCount = Math.max(0, Number(customQr.extendedCount || metadata.usedCount || 0));

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
        createdAt: customQr.createdAt.toISOString(),
        maxUses,
        usedCount,
      },
    });
  } catch (error: any) {
    console.error("[API QR Validate] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
