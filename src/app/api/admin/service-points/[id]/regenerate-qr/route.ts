import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { generateQrPngDataUrl } from "@/lib/qr";

// POST /api/admin/service-points/[id]/regenerate-qr - Regenerar código QR para un punto de servicio
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Generar nuevo código QR único
    const qrCode = `SERVICE_POINT_${randomBytes(8).toString('hex').toUpperCase()}`;

    // Actualizar el service point con el nuevo código QR
    const updatedServicePoint = await prisma.servicePoint.update({
      where: { id: params.id },
      data: {
        qrCode: qrCode,
        updatedAt: new Date()
      },
      include: {
        location: true
      }
    });

    // Generar QR como Data URL
    const qrDataUrl = await generateQrPngDataUrl(qrCode);

    return NextResponse.json({
      servicePoint: updatedServicePoint,
      qrCode: qrCode,
      qrDataUrl: qrDataUrl
    });
  } catch (error) {
    console.error("Error regenerating service point QR:", error);

    // Si es un error de "no encontrado", devolver 404
    if ((error as any)?.code === 'P2025') {
      return NextResponse.json(
        { error: "Punto de servicio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
