import { Mundial2026MatchStatus } from "@prisma/client";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_CAMPAIGN_SLUG = "mundial2026";

const createMatchSchema = z.object({
  stage: z.string().trim().max(120).optional().or(z.literal("")),
  homeTeam: z.string().trim().min(2, "Equipo local requerido").max(120, "Nombre demasiado largo"),
  awayTeam: z.string().trim().min(2, "Equipo visitante requerido").max(120, "Nombre demasiado largo"),
  startsAt: z.string().datetime({ offset: true }),
  predictionClosesAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  externalKey: z.string().trim().max(100, "Clave externa demasiado larga").optional().or(z.literal("")),
});

async function getCampaign() {
  return prisma.mundial2026Campaign.findFirst({
    where: { slug: DEFAULT_CAMPAIGN_SLUG },
    select: { id: true, slug: true },
  });
}

export async function GET() {
  try {
    const settleableStatuses: Mundial2026MatchStatus[] = [
      Mundial2026MatchStatus.SCHEDULED,
      Mundial2026MatchStatus.OPEN,
      Mundial2026MatchStatus.CLOSED,
      Mundial2026MatchStatus.FINISHED,
    ];

    const matches = await prisma.mundial2026Match.findMany({
      orderBy: [{ startsAt: "asc" }],
      include: {
        predictions: {
          select: {
            id: true,
            status: true,
            claimStatus: true,
            assignedPrizeId: true,
          },
        },
        matchPrizes: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            prize: {
              select: {
                id: true,
                key: true,
                label: true,
                description: true,
                color: true,
                stockTotal: true,
                stockReserved: true,
                stockClaimed: true,
                claimWindowHours: true,
              },
            },
          },
        },
      },
    });

    return apiOk({
      total: matches.length,
      matches: matches.map((match) => ({
        id: match.id,
        externalKey: match.externalKey,
        stage: match.stage,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        startsAt: match.startsAt,
        predictionClosesAt: match.predictionClosesAt,
        status: match.status,
        result: match.result,
        settledAt: match.settledAt,
        stats: {
          totalPredictions: match.predictions.length,
          won: match.predictions.filter((item) => item.status === "WON").length,
          available: match.predictions.filter((item) => item.claimStatus === "AVAILABLE").length,
          redeemed: match.predictions.filter((item) => item.claimStatus === "REDEEMED").length,
        },
        canSettle: settleableStatuses.includes(match.status),
        prizes: match.matchPrizes.map((item) => ({
          id: item.id,
          prizeId: item.prizeId,
          key: item.prize.key,
          label: item.prize.label,
          description: item.prize.description,
          color: item.prize.color,
          assignmentMode: item.assignmentMode,
          maxWinners: item.maxWinners,
          sortOrder: item.sortOrder,
          active: item.active,
          stockTotal: item.prize.stockTotal,
          stockReserved: item.prize.stockReserved,
          stockClaimed: item.prize.stockClaimed,
          claimWindowHours: item.prize.claimWindowHours,
        })),
      })),
    });
  } catch (error) {
    console.error("Error listing Mundial 2026 admin matches:", error);
    return apiError("INTERNAL_ERROR", "No se pudieron cargar los partidos de Mundial 2026", {}, 500);
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = createMatchSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos para crear el partido.", parsed.error.flatten(), 400);
    }

    const campaign = await getCampaign();
    if (!campaign) {
      return apiError("CAMPAIGN_NOT_FOUND", "Campaña Mundial 2026 no encontrada.", {}, 404);
    }

    const startsAt = new Date(parsed.data.startsAt);
    const predictionClosesAt = parsed.data.predictionClosesAt
      ? new Date(parsed.data.predictionClosesAt)
      : new Date(startsAt.getTime() - 15 * 60 * 1000);
    const status = predictionClosesAt.getTime() > Date.now() ? Mundial2026MatchStatus.OPEN : Mundial2026MatchStatus.CLOSED;
    const externalKey = parsed.data.externalKey?.trim() || `fwc26-manual-${Date.now()}`;

    const match = await prisma.mundial2026Match.create({
      data: {
        campaignId: campaign.id,
        externalKey,
        stage: parsed.data.stage?.trim() || "Manual",
        homeTeam: parsed.data.homeTeam.trim(),
        awayTeam: parsed.data.awayTeam.trim(),
        startsAt,
        predictionClosesAt,
        status,
      },
      select: {
        id: true,
        externalKey: true,
        stage: true,
        homeTeam: true,
        awayTeam: true,
        startsAt: true,
        predictionClosesAt: true,
        status: true,
      },
    });

    return apiOk({ match }, 201);
  } catch (error) {
    console.error("Error creating Mundial 2026 match:", error);
    const message = error instanceof Error ? error.message : "No se pudo crear el partido.";
    const status = message.includes("Unique constraint") ? 409 : 500;
    return apiError("CREATE_FAILED", status === 409 ? "Ya existe un partido con esa clave externa." : message, {}, status);
  }
}