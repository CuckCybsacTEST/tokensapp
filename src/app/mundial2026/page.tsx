import { Mundial2026CampaignStatus, Mundial2026MatchStatus } from "@prisma/client";
import { DateTime } from "luxon";

import Mundial2026HomeClient from "./Mundial2026HomeClient";
import { getMundial2026NowInLima, getMundial2026NowMs, getMundial2026SimulatedNowIso, isMundial2026PredictionWindowOpen } from "@/lib/mundial2026/time";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_CAMPAIGN_SLUG = "mundial2026";
const DEFAULT_TIMEZONE = "America/Lima";

async function loadPublicMatches() {
  const campaign = await prisma.mundial2026Campaign.findFirst({
    where: {
      slug: DEFAULT_CAMPAIGN_SLUG,
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
    return {
      campaignSlug: DEFAULT_CAMPAIGN_SLUG,
      matches: [],
      sectionTitle: "Campaña no disponible",
      sectionHint: "Aún no se activó la campaña pública de Mundial 2026.",
      simulatedNowIso: getMundial2026SimulatedNowIso(),
    };
  }

  const nowLima = getMundial2026NowInLima();
  const nowMs = getMundial2026NowMs();
  const todayStart = nowLima.startOf("day").toJSDate();
  const todayEnd = nowLima.endOf("day").toJSDate();
  const visibleStatuses = [
    Mundial2026MatchStatus.SCHEDULED,
    Mundial2026MatchStatus.OPEN,
    Mundial2026MatchStatus.CLOSED,
    Mundial2026MatchStatus.FINISHED,
    Mundial2026MatchStatus.SETTLED,
  ];

  const includePrizes = {
    matchPrizes: {
      where: { active: true },
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      include: {
        prize: {
          select: {
            id: true,
            key: true,
            label: true,
            description: true,
            color: true,
          },
        },
      },
    },
  };

  const todayMatches = await prisma.mundial2026Match.findMany({
    where: {
      campaignId: campaign.id,
      startsAt: {
        gte: todayStart,
        lte: todayEnd,
      },
      status: { in: visibleStatuses },
    },
    orderBy: { startsAt: "asc" },
    include: includePrizes,
  });

  const sourceMatches =
    todayMatches.length > 0
      ? todayMatches
      : await prisma.mundial2026Match.findMany({
          where: {
            campaignId: campaign.id,
            startsAt: { gte: todayStart },
            status: { in: visibleStatuses },
          },
          orderBy: { startsAt: "asc" },
          take: 8,
          include: includePrizes,
        });

  return {
    campaignSlug: campaign.slug,
    sectionTitle: todayMatches.length > 0 ? "Partidos del día" : "Próximos partidos abiertos para pronóstico",
    sectionHint:
      todayMatches.length > 0
        ? "Elige uno de los partidos activos de hoy y registra tu jugada antes del cierre."
        : "Todavía no empieza la jornada de hoy en Lima. Ya puedes preparar tus jugadas para los próximos cruces.",
    simulatedNowIso: getMundial2026SimulatedNowIso(),
    matches: sourceMatches.map((match) => ({
      id: match.id,
      externalKey: match.externalKey,
      stage: match.stage,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startsAt: match.startsAt.toISOString(),
      predictionClosesAt: match.predictionClosesAt.toISOString(),
      status: match.status,
      predictionsOpen: isMundial2026PredictionWindowOpen({ status: match.status, startsAt: match.startsAt, nowMs }),
      prizes: match.matchPrizes.map((item) => ({
        id: item.prize.id,
        key: item.prize.key,
        label: item.prize.label,
        description: item.prize.description,
        color: item.prize.color,
        assignmentMode: item.assignmentMode,
        maxWinners: item.maxWinners,
      })),
    })),
  };
}

export default async function Mundial2026Page() {
  const { campaignSlug, matches, sectionHint, sectionTitle, simulatedNowIso } = await loadPublicMatches();

  return <Mundial2026HomeClient campaignSlug={campaignSlug} initialMatches={matches} sectionHint={sectionHint} sectionTitle={sectionTitle} simulatedNowIso={simulatedNowIso} />;
}