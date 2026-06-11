import { Mundial2026CampaignStatus, Mundial2026MatchStatus } from "@prisma/client";
import { DateTime } from "luxon";

import { apiError, apiOk } from "@/lib/apiError";
import { getMundial2026NowInLima, getMundial2026NowMs, isMundial2026PredictionWindowOpen } from "@/lib/mundial2026/time";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_CAMPAIGN_SLUG = "mundial2026";
const DEFAULT_TIMEZONE = "America/Lima";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const campaignSlug = url.searchParams.get("campaign") || DEFAULT_CAMPAIGN_SLUG;
    const includeSettled = url.searchParams.get("includeSettled") === "1";
    const nowLima = getMundial2026NowInLima();
    const nowMs = getMundial2026NowMs();
    const dayStart = nowLima.startOf("day").toJSDate();
    const dayEnd = nowLima.endOf("day").toJSDate();

    const campaign = await prisma.mundial2026Campaign.findFirst({
      where: {
        slug: campaignSlug,
        status: Mundial2026CampaignStatus.ACTIVE,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        timezone: true,
      },
    });

    if (!campaign) {
      return apiError("CAMPAIGN_NOT_FOUND", "Campaña Mundial 2026 no encontrada o inactiva", { campaignSlug }, 404);
    }

    const statuses = includeSettled
      ? [
          Mundial2026MatchStatus.SCHEDULED,
          Mundial2026MatchStatus.OPEN,
          Mundial2026MatchStatus.CLOSED,
          Mundial2026MatchStatus.FINISHED,
          Mundial2026MatchStatus.SETTLED,
        ]
      : [Mundial2026MatchStatus.SCHEDULED, Mundial2026MatchStatus.OPEN, Mundial2026MatchStatus.CLOSED];

    const matches = await prisma.mundial2026Match.findMany({
      where: {
        campaignId: campaign.id,
        startsAt: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: { in: statuses },
      },
      orderBy: { startsAt: "asc" },
      include: {
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
                imageUrl: true,
                active: true,
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

    const data = matches.map((match) => {
      const predictionsOpen = isMundial2026PredictionWindowOpen({ status: match.status, startsAt: match.startsAt, nowMs });

      return {
        id: match.id,
        campaignId: match.campaignId,
        externalKey: match.externalKey,
        stage: match.stage,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        startsAt: match.startsAt,
        predictionClosesAt: match.predictionClosesAt,
        status: match.status,
        result: match.result,
        predictionsOpen,
        prizes: match.matchPrizes
          .filter((item) => item.prize.active)
          .map((item) => ({
            id: item.prize.id,
            key: item.prize.key,
            label: item.prize.label,
            description: item.prize.description,
            color: item.prize.color,
            imageUrl: item.prize.imageUrl,
            assignmentMode: item.assignmentMode,
            maxWinners: item.maxWinners,
            claimWindowHours: item.prize.claimWindowHours,
            stockTotal: item.prize.stockTotal,
          })),
      };
    });

    return apiOk({
      campaign,
      serverTime: nowLima.toISO(),
      matches: data,
    });
  } catch (error) {
    console.error("Error fetching Mundial 2026 matches:", error);
    return apiError("INTERNAL_ERROR", "No se pudieron cargar los partidos de Mundial 2026", {}, 500);
  }
}