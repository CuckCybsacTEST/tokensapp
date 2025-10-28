import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

// POST /api/admin/service-points/[id]/regenerate-qr - Regenerar QR para un punto de servicio
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar que el service point existe
    const servicePoint = await prisma.servicePoint.findUnique({
      where: { id: params.id },
      include: { location: true }
    });

    if (!servicePoint) {
      return NextResponse.json(
        { error: "Punto de servicio no encontrado" },
        { status: 404 }
      );
    }

    // Generar nueva URL única para el QR
    // Formato: /menu?table={servicePointId}&v={timestamp}-{random}
    const timestamp = Date.now();
    const randomSuffix = randomBytes(4).toString('hex');
    const version = `${timestamp}-${randomSuffix}`;
    const newQrUrl = `/menu?table=${servicePoint.id}&v=${version}`;

    // Actualizar el service point con la nueva URL de QR
    const updatedServicePoint = await prisma.servicePoint.update({
      where: { id: params.id },
      data: {
        qrCode: newQrUrl,
        updatedAt: new Date()
      },
      include: { location: true }
    });

    console.log(`🔄 QR regenerado para service point ${servicePoint.name || servicePoint.number}: ${newQrUrl}`);

    return NextResponse.json({
      success: true,
      servicePoint: updatedServicePoint,
      qrUrl: newQrUrl,
      message: `QR regenerado exitosamente para ${servicePoint.name || servicePoint.number}`
    });

  } catch (error) {
    console.error("Error regenerating QR:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}