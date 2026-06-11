import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { qrCode: string } }) {
  try {
    const prediction = await prisma.mundial2026Prediction.findUnique({
      where: { qrCode: params.qrCode },
      select: {
        id: true,
        qrCode: true,
        pick: true,
        status: true,
        claimStatus: true,
        availableAt: true,
        claimExpiresAt: true,
        redeemedAt: true,
        createdAt: true,
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            startsAt: true,
            status: true,
            result: true,
          },
        },
        participant: {
          select: {
            id: true,
            name: true,
            whatsappNormalized: true,
          },
        },
        assignedPrize: {
          select: {
            id: true,
            key: true,
            label: true,
            description: true,
            color: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!prediction) {
      return apiError("PREDICTION_NOT_FOUND", "Jugada no encontrada", { qrCode: params.qrCode }, 404);
    }

    return apiOk({ prediction }, 200);
  } catch (error) {
    console.error("Error fetching mundial2026 prediction:", error);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", {}, 500);
  }
}