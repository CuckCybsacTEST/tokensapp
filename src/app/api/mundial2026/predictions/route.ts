import {
  Mundial2026CampaignStatus,
  Mundial2026ClaimStatus,
  Mundial2026MatchStatus,
  Mundial2026PredictionPick,
  Mundial2026PredictionStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { getMundial2026NameValidationError } from "@/lib/mundial2026/name";
import {
  buildMundial2026PredictionQrPayload,
  CURRENT_MUNDIAL2026_SIGNATURE_VERSION,
  generateMundial2026QrCode,
  signMundial2026Prediction,
} from "@/lib/mundial2026/signing";
import { getMundial2026NowMs, isMundial2026PredictionWindowOpen } from "@/lib/mundial2026/time";
import { maskMundial2026WhatsApp, normalizeMundial2026WhatsApp } from "@/lib/mundial2026/whatsapp";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_CAMPAIGN_SLUG = "mundial2026";

const predictionSchema = z.object({
  campaignSlug: z.string().trim().min(1).default(DEFAULT_CAMPAIGN_SLUG),
  matchId: z.string().trim().min(1, "matchId es requerido"),
  pick: z
    .enum(["HOME", "DRAW", "AWAY", "home", "draw", "away"])
    .transform((value) => value.toUpperCase() as Mundial2026PredictionPick),
  name: z.string().trim().min(2, "Nombre es requerido").max(120, "Nombre demasiado largo"),
  whatsapp: z.string().trim().min(6, "WhatsApp es requerido").max(30, "WhatsApp inválido"),
});

function serializePrediction(prediction: {
  id: string;
  qrCode: string;
  signature: string;
  signatureVersion: number;
  pick: Mundial2026PredictionPick;
  status: Mundial2026PredictionStatus;
  claimStatus: Mundial2026ClaimStatus;
  createdAt: Date;
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    startsAt: Date;
  };
}, requestUrl?: string) {
  return {
    id: prediction.id,
    qrCode: prediction.qrCode,
    signature: prediction.signature,
    signatureVersion: prediction.signatureVersion,
    pick: prediction.pick,
    status: prediction.status,
    claimStatus: prediction.claimStatus,
    createdAt: prediction.createdAt,
    match: prediction.match,
    qrPayload: buildMundial2026PredictionQrPayload({
      predictionId: prediction.id,
      qrCode: prediction.qrCode,
      signature: prediction.signature,
      signatureVersion: prediction.signatureVersion,
      urlOrReq: requestUrl,
    }),
  };
}

export async function POST(req: Request) {
  try {
    const nowMs = getMundial2026NowMs();
    const json = await req.json();
    const parsed = predictionSchema.safeParse(json);
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
      return apiError("INVALID_WHATSAPP", "WhatsApp inválido", { whatsapp: data.whatsapp }, 400);
    }

    const campaign = await prisma.mundial2026Campaign.findFirst({
      where: {
        slug: data.campaignSlug,
        status: Mundial2026CampaignStatus.ACTIVE,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (!campaign) {
      return apiError("CAMPAIGN_NOT_FOUND", "Campaña Mundial 2026 no encontrada o inactiva", { campaignSlug: data.campaignSlug }, 404);
    }

    const match = await prisma.mundial2026Match.findFirst({
      where: {
        id: data.matchId,
        campaignId: campaign.id,
      },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        startsAt: true,
        predictionClosesAt: true,
        status: true,
      },
    });

    if (!match) {
      return apiError("MATCH_NOT_FOUND", "Partido no encontrado", { matchId: data.matchId }, 404);
    }

    if (!isMundial2026PredictionWindowOpen({ status: match.status, startsAt: match.startsAt, nowMs })) {
      return apiError("MATCH_CLOSED", "Las predicciones para este partido ya cerraron", { matchId: match.id }, 409);
    }

    const existingParticipant = await prisma.mundial2026Participant.findUnique({
      where: {
        campaignId_whatsappNormalized: {
          campaignId: campaign.id,
          whatsappNormalized,
        },
      },
      select: { id: true },
    });

    if (existingParticipant) {
      const existingPrediction = await prisma.mundial2026Prediction.findUnique({
        where: {
          matchId_participantId: {
            matchId: match.id,
            participantId: existingParticipant.id,
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

      if (existingPrediction) {
        return apiError(
          "ALREADY_PARTICIPATED",
          "Ya participaste en este partido. Cada WhatsApp puede hacer una sola jugada por encuentro.",
          {
            whatsapp: maskMundial2026WhatsApp(whatsappNormalized),
            prediction: serializePrediction(existingPrediction, req.url),
          },
          409
        );
      }
    }

    const predictionId = crypto.randomUUID();
    const qrCode = generateMundial2026QrCode();
    const signature = signMundial2026Prediction(predictionId, qrCode, CURRENT_MUNDIAL2026_SIGNATURE_VERSION);

    const created = await prisma.$transaction(async (tx) => {
      const participant = await tx.mundial2026Participant.upsert({
        where: {
          campaignId_whatsappNormalized: {
            campaignId: campaign.id,
            whatsappNormalized,
          },
        },
        create: {
          campaignId: campaign.id,
          name: data.name,
          whatsappRaw: data.whatsapp,
          whatsappNormalized,
        },
        update: {
          name: data.name,
          whatsappRaw: data.whatsapp,
        },
      });

      return tx.mundial2026Prediction.create({
        data: {
          id: predictionId,
          campaignId: campaign.id,
          matchId: match.id,
          participantId: participant.id,
          pick: data.pick,
          status: Mundial2026PredictionStatus.PENDING,
          qrCode,
          signature,
          signatureVersion: CURRENT_MUNDIAL2026_SIGNATURE_VERSION,
          claimStatus: Mundial2026ClaimStatus.BLOCKED,
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
    });

    return apiOk(
      {
        campaign,
        participant: {
          name: data.name,
          whatsappMasked: maskMundial2026WhatsApp(whatsappNormalized),
        },
        prediction: serializePrediction(created, req.url),
      },
      201
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(
        "ALREADY_PARTICIPATED",
        "Ya participaste en este partido. Cada WhatsApp puede hacer una sola jugada por encuentro.",
        {},
        409
      );
    }

    console.error("Error creating Mundial 2026 prediction:", error);
    return apiError("INTERNAL_ERROR", "No se pudo guardar la jugada de Mundial 2026", {}, 500);
  }
}