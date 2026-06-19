import { Mundial2026CampaignStatus, Mundial2026MatchStatus } from "@prisma/client";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { getMundial2026NameValidationError, normalizeMundial2026Name } from "@/lib/mundial2026/name";
import { buildMundial2026PredictionQrPayload } from "@/lib/mundial2026/signing";
import { MUNDIAL2026_RECOVERY_WINDOW_HOURS, getMundial2026NowInLima } from "@/lib/mundial2026/time";
import { normalizeMundial2026WhatsApp } from "@/lib/mundial2026/whatsapp";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_CAMPAIGN_SLUG = "mundial2026";

const recoverPredictionSchema = z.object({
  campaignSlug: z.string().trim().min(1).default(DEFAULT_CAMPAIGN_SLUG),
  matchId: z.string().trim().min(1, "matchId es requerido"),
  name: z.string().trim().min(2, "Nombre es requerido").max(120, "Nombre demasiado largo"),
  whatsapp: z.string().trim().min(6, "WhatsApp es requerido").max(30, "WhatsApp inválido"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = recoverPredictionSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
    }

    const data = parsed.data;
    const nameError = getMundial2026NameValidationError(data.name);
    if (nameError) {
      return apiError("INVALID_NAME", nameError, { name: data.name }, 400);
    }

    const whatsappNormalized = normalizeMundial2026WhatsApp(data.whatsapp);
    if (!whatsappNormalized) {
      return apiError("INVALID_WHATSAPP", "WhatsApp inválido", {}, 400);
    }

    const campaign = await prisma.mundial2026Campaign.findFirst({
      where: {
        slug: data.campaignSlug,
        status: Mundial2026CampaignStatus.ACTIVE,
      },
      select: { id: true, slug: true },
    });

    if (!campaign) {
      return apiError("CAMPAIGN_NOT_FOUND", "Campaña no disponible.", {}, 404);
    }

    const participant = await prisma.mundial2026Participant.findUnique({
      where: {
        campaignId_whatsappNormalized: {
          campaignId: campaign.id,
          whatsappNormalized,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!participant || normalizeMundial2026Name(participant.name) !== normalizeMundial2026Name(data.name)) {
      return apiError("PREDICTION_NOT_FOUND", "No encontramos una jugada con esos datos.", {}, 404);
    }

    const prediction = await prisma.mundial2026Prediction.findUnique({
      where: {
        matchId_participantId: {
          matchId: data.matchId,
          participantId: participant.id,
        },
      },
      include: {
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            startsAt: true,
          },
        },
      },
    });

    if (!prediction || prediction.campaignId !== campaign.id) {
      return apiError("PREDICTION_NOT_FOUND", "No encontramos una jugada con esos datos.", {}, 404);
    }

    const match = prediction.match;
    const matchRecord = await prisma.mundial2026Match.findUnique({
      where: { id: match.id },
      select: {
        settledAt: true,
        status: true,
      },
    });

    if (!matchRecord || matchRecord.status !== Mundial2026MatchStatus.SETTLED) {
      return apiError("MATCH_NOT_RECOVERABLE", "Esta jugada todavía no está disponible para recuperar.", { matchId: match.id }, 409);
    }

    if (!matchRecord.settledAt) {
      return apiError("MATCH_NOT_RECOVERABLE", "Esta jugada todavía no está disponible para recuperar.", { matchId: match.id }, 409);
    }

    const nowLima = getMundial2026NowInLima();
    const recoveryWindowStart = new Date(nowLima.toJSDate().getTime() - MUNDIAL2026_RECOVERY_WINDOW_HOURS * 60 * 60 * 1000);
    if (matchRecord.settledAt.getTime() < recoveryWindowStart.getTime()) {
      return apiError(
        "MATCH_RECOVERY_EXPIRED",
        "Esta jugada ya superó el plazo de recuperación de 72 horas.",
        { matchId: match.id, settledAt: matchRecord.settledAt.toISOString() },
        410
      );
    }

    const detailPath = `/mundial2026/jugada/${encodeURIComponent(prediction.qrCode)}`;

    return apiOk({
      prediction: {
        id: prediction.id,
        qrCode: prediction.qrCode,
        detailPath,
        qrPayload: buildMundial2026PredictionQrPayload({
          predictionId: prediction.id,
          qrCode: prediction.qrCode,
          signature: prediction.signature,
          signatureVersion: prediction.signatureVersion,
          urlOrReq: req.url,
        }),
        match: {
          id: prediction.match.id,
          homeTeam: prediction.match.homeTeam,
          awayTeam: prediction.match.awayTeam,
          startsAt: prediction.match.startsAt,
        },
      },
    });
  } catch (error) {
    console.error("Error recovering Mundial 2026 prediction:", error);
    return apiError("INTERNAL_ERROR", "No se pudo recuperar la jugada.", {}, 500);
  }
}
