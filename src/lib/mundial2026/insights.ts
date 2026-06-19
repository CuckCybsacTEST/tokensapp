import { Mundial2026ClaimStatus, Mundial2026PredictionStatus, Mundial2026RedemptionResult } from "@prisma/client";

import { getMundial2026EffectiveClaimStatus, getMundial2026NowDate } from "@/lib/mundial2026/time";
import { prisma } from "@/lib/prisma";

const DEFAULT_CAMPAIGN_SLUG = "mundial2026";

type CountRow<T extends string> = {
  key: T;
  total: number;
};

function toCountMap<T extends string>(rows: Array<{ key: T; total: number }>) {
  return rows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.key] = row.total;
    return accumulator;
  }, {});
}

function getCount<T extends string>(map: Record<string, number>, key: T) {
  return map[key] || 0;
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

export async function getMundial2026Insights(campaignSlug = DEFAULT_CAMPAIGN_SLUG) {
  const campaign = await prisma.mundial2026Campaign.findFirst({
    where: { slug: campaignSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      timezone: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!campaign) {
    throw new Error("Campaña Mundial 2026 no encontrada.");
  }

  const [
    participantsTotal,
    participants,
    matches,
    predictions,
    predictionStatusRows,
    claimStatusRows,
    assignedPredictionsTotal,
    winnersWithoutPrizeTotal,
    prizes,
    redemptionLogs,
  ] = await Promise.all([
    prisma.mundial2026Participant.count({ where: { campaignId: campaign.id } }),
    prisma.mundial2026Participant.findMany({
      where: { campaignId: campaign.id },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        whatsappNormalized: true,
        createdAt: true,
        predictions: {
          orderBy: [{ createdAt: "desc" }],
          select: {
            createdAt: true,
            status: true,
            claimStatus: true,
            claimExpiresAt: true,
            redeemedAt: true,
          },
        },
      },
    }),
    prisma.mundial2026Match.findMany({
      where: { campaignId: campaign.id },
      orderBy: [{ startsAt: "asc" }],
      select: {
        id: true,
        stage: true,
        homeTeam: true,
        awayTeam: true,
        startsAt: true,
        status: true,
        result: true,
        settledAt: true,
        predictions: {
          select: {
            status: true,
            claimStatus: true,
            assignedPrizeId: true,
            claimExpiresAt: true,
            redeemedAt: true,
          },
        },
      },
    }),
    prisma.mundial2026Prediction.findMany({
      where: { campaignId: campaign.id },
      orderBy: [{ match: { startsAt: "desc" } }, { createdAt: "desc" }],
      select: {
        id: true,
        qrCode: true,
        pick: true,
        status: true,
        claimStatus: true,
        createdAt: true,
        availableAt: true,
        claimExpiresAt: true,
        redeemedAt: true,
        participant: {
          select: {
            id: true,
            name: true,
            whatsappNormalized: true,
          },
        },
        match: {
          select: {
            id: true,
            stage: true,
            homeTeam: true,
            awayTeam: true,
            startsAt: true,
            result: true,
            status: true,
          },
        },
        assignedPrize: {
          select: {
            id: true,
            label: true,
            color: true,
          },
        },
      },
    }),
    prisma.mundial2026Prediction.groupBy({
      by: ["status"],
      where: { campaignId: campaign.id },
      _count: { _all: true },
    }),
    prisma.mundial2026Prediction.groupBy({
      by: ["claimStatus"],
      where: { campaignId: campaign.id },
      _count: { _all: true },
    }),
    prisma.mundial2026Prediction.count({
      where: {
        campaignId: campaign.id,
        assignedPrizeId: { not: null },
      },
    }),
    prisma.mundial2026Prediction.count({
      where: {
        campaignId: campaign.id,
        status: Mundial2026PredictionStatus.WON,
        assignedPrizeId: null,
      },
    }),
    prisma.mundial2026Prize.findMany({
      where: { campaignId: campaign.id },
      orderBy: [{ priority: "asc" }, { label: "asc" }],
      select: {
        id: true,
        key: true,
        label: true,
        description: true,
        color: true,
        active: true,
        priority: true,
        stockTotal: true,
        stockReserved: true,
        stockClaimed: true,
        assignedPredictions: {
          select: {
            status: true,
            claimStatus: true,
            claimExpiresAt: true,
            redeemedAt: true,
          },
        },
        matchPrizes: {
          select: {
            id: true,
          },
        },
      },
    }),
    prisma.mundial2026RedemptionLog.findMany({
      where: {
        prediction: {
          campaignId: campaign.id,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        action: true,
        result: true,
        byUserId: true,
        byUser: {
          select: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const predictionCounts = toCountMap(
    predictionStatusRows.map((row) => ({
      key: row.status,
      total: row._count._all,
    }))
  );
  const now = getMundial2026NowDate();
  const claimCounts = predictions.reduce<Record<string, number>>((accumulator, prediction) => {
    const effectiveClaimStatus = getMundial2026EffectiveClaimStatus({
      claimStatus: prediction.claimStatus,
      claimExpiresAt: prediction.claimExpiresAt,
      redeemedAt: prediction.redeemedAt,
      now,
    });
    accumulator[effectiveClaimStatus] = (accumulator[effectiveClaimStatus] || 0) + 1;
    return accumulator;
  }, {});

  const predictionsTotal = Object.values(predictionCounts).reduce((total, value) => total + value, 0);
  const settledMatchesTotal = matches.filter((match) => !!match.settledAt || match.status === "SETTLED").length;
  const wonTotal = getCount(predictionCounts, Mundial2026PredictionStatus.WON);
  const lostTotal = getCount(predictionCounts, Mundial2026PredictionStatus.LOST);
  const voidTotal = getCount(predictionCounts, Mundial2026PredictionStatus.VOID);
  const expiredPredictionTotal = getCount(predictionCounts, Mundial2026PredictionStatus.EXPIRED);
  const availableTotal = getCount(claimCounts, Mundial2026ClaimStatus.AVAILABLE);
  const redeemedTotal = getCount(claimCounts, Mundial2026ClaimStatus.REDEEMED);
  const expiredClaimTotal = getCount(claimCounts, Mundial2026ClaimStatus.EXPIRED);
  const blockedClaimTotal = getCount(claimCounts, Mundial2026ClaimStatus.BLOCKED);
  const rejectedClaimTotal = getCount(claimCounts, Mundial2026ClaimStatus.REJECTED);

  const matchesBreakdown = matches.map((match) => {
    const totalPredictions = match.predictions.length;
    const winners = match.predictions.filter((prediction) => prediction.status === "WON").length;
    const losers = match.predictions.filter((prediction) => prediction.status === "LOST").length;
    const available = match.predictions.filter((prediction) =>
      getMundial2026EffectiveClaimStatus({
        claimStatus: prediction.claimStatus,
        claimExpiresAt: prediction.claimExpiresAt,
        redeemedAt: prediction.redeemedAt,
        now,
      }) === "AVAILABLE"
    ).length;
    const redeemed = match.predictions.filter((prediction) =>
      getMundial2026EffectiveClaimStatus({
        claimStatus: prediction.claimStatus,
        claimExpiresAt: prediction.claimExpiresAt,
        redeemedAt: prediction.redeemedAt,
        now,
      }) === "REDEEMED"
    ).length;
    const expired = match.predictions.filter((prediction) =>
      getMundial2026EffectiveClaimStatus({
        claimStatus: prediction.claimStatus,
        claimExpiresAt: prediction.claimExpiresAt,
        redeemedAt: prediction.redeemedAt,
        now,
      }) === "EXPIRED"
    ).length;
    const assigned = match.predictions.filter((prediction) => !!prediction.assignedPrizeId).length;

    return {
      id: match.id,
      stage: match.stage,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startsAt: match.startsAt.toISOString(),
      status: match.status,
      result: match.result,
      settledAt: match.settledAt ? match.settledAt.toISOString() : null,
      totalPredictions,
      winners,
      losers,
      available,
      redeemed,
      expired,
      assigned,
      winRate: percentage(winners, totalPredictions),
      redemptionRate: percentage(redeemed, assigned || winners),
    };
  });

  const participantsBreakdown = participants.map((participant) => {
    const totalPredictions = participant.predictions.length;
    const won = participant.predictions.filter((prediction) => prediction.status === "WON").length;
    const lost = participant.predictions.filter((prediction) => prediction.status === "LOST").length;
    const available = participant.predictions.filter((prediction) =>
      getMundial2026EffectiveClaimStatus({
        claimStatus: prediction.claimStatus,
        claimExpiresAt: prediction.claimExpiresAt,
        redeemedAt: prediction.redeemedAt,
        now,
      }) === "AVAILABLE"
    ).length;
    const redeemed = participant.predictions.filter((prediction) =>
      getMundial2026EffectiveClaimStatus({
        claimStatus: prediction.claimStatus,
        claimExpiresAt: prediction.claimExpiresAt,
        redeemedAt: prediction.redeemedAt,
        now,
      }) === "REDEEMED"
    ).length;
    const expired = participant.predictions.filter((prediction) =>
      getMundial2026EffectiveClaimStatus({
        claimStatus: prediction.claimStatus,
        claimExpiresAt: prediction.claimExpiresAt,
        redeemedAt: prediction.redeemedAt,
        now,
      }) === "EXPIRED"
    ).length;
    const lastPredictionAt = participant.predictions[0]?.createdAt || null;

    return {
      id: participant.id,
      name: participant.name,
      whatsappNormalized: participant.whatsappNormalized,
      createdAt: participant.createdAt.toISOString(),
      totalPredictions,
      won,
      lost,
      available,
      redeemed,
      expired,
      lastPredictionAt: lastPredictionAt ? lastPredictionAt.toISOString() : null,
    };
  });

  const predictionsBreakdown = predictions.map((prediction) => ({
    id: prediction.id,
    qrCode: prediction.qrCode,
    detailPath: `/mundial2026/jugada/${encodeURIComponent(prediction.qrCode)}`,
    participant: {
      id: prediction.participant.id,
      name: prediction.participant.name,
      whatsappNormalized: prediction.participant.whatsappNormalized,
    },
    match: {
      id: prediction.match.id,
      stage: prediction.match.stage,
      homeTeam: prediction.match.homeTeam,
      awayTeam: prediction.match.awayTeam,
      startsAt: prediction.match.startsAt.toISOString(),
      result: prediction.match.result,
      status: prediction.match.status,
    },
    pick: prediction.pick,
    status: prediction.status,
    claimStatus: getMundial2026EffectiveClaimStatus({
      claimStatus: prediction.claimStatus,
      claimExpiresAt: prediction.claimExpiresAt,
      redeemedAt: prediction.redeemedAt,
      now,
    }),
    isCorrect: prediction.status === Mundial2026PredictionStatus.WON,
    createdAt: prediction.createdAt.toISOString(),
    availableAt: prediction.availableAt ? prediction.availableAt.toISOString() : null,
    claimExpiresAt: prediction.claimExpiresAt ? prediction.claimExpiresAt.toISOString() : null,
    redeemedAt: prediction.redeemedAt ? prediction.redeemedAt.toISOString() : null,
    assignedPrize: prediction.assignedPrize
      ? {
          id: prediction.assignedPrize.id,
          label: prediction.assignedPrize.label,
          color: prediction.assignedPrize.color,
        }
      : null,
  }));

  const prizesBreakdown = prizes.map((prize) => {
    const assignedPredictions = prize.assignedPredictions.length;
    const winners = prize.assignedPredictions.filter((prediction) => prediction.status === "WON").length;
    const available = prize.assignedPredictions.filter((prediction) =>
      getMundial2026EffectiveClaimStatus({
        claimStatus: prediction.claimStatus,
        claimExpiresAt: prediction.claimExpiresAt,
        redeemedAt: prediction.redeemedAt,
        now,
      }) === "AVAILABLE"
    ).length;
    const redeemed = prize.assignedPredictions.filter((prediction) =>
      getMundial2026EffectiveClaimStatus({
        claimStatus: prediction.claimStatus,
        claimExpiresAt: prediction.claimExpiresAt,
        redeemedAt: prediction.redeemedAt,
        now,
      }) === "REDEEMED"
    ).length;
    const expired = prize.assignedPredictions.filter((prediction) =>
      getMundial2026EffectiveClaimStatus({
        claimStatus: prediction.claimStatus,
        claimExpiresAt: prediction.claimExpiresAt,
        redeemedAt: prediction.redeemedAt,
        now,
      }) === "EXPIRED"
    ).length;
    const remainingStock = prize.stockTotal == null ? null : Math.max(prize.stockTotal - prize.stockClaimed - prize.stockReserved, 0);

    return {
      id: prize.id,
      key: prize.key,
      label: prize.label,
      description: prize.description,
      color: prize.color,
      active: prize.active,
      priority: prize.priority,
      stockTotal: prize.stockTotal,
      stockReserved: prize.stockReserved,
      stockClaimed: prize.stockClaimed,
      remainingStock,
      assignedMatches: prize.matchPrizes.length,
      assignedPredictions,
      winners,
      available,
      redeemed,
      expired,
      redemptionRate: percentage(redeemed, assignedPredictions || winners),
    };
  });

  const redemptionResultRows: CountRow<Mundial2026RedemptionResult>[] = [];
  const redemptionResultMap = new Map<Mundial2026RedemptionResult, number>();
  const operatorMap = new Map<string, { name: string; redemptionsOk: number; attempts: number; invalid: number }>();

  redemptionLogs.forEach((log) => {
    redemptionResultMap.set(log.result, (redemptionResultMap.get(log.result) || 0) + 1);

    if (!log.byUserId) return;

    const current = operatorMap.get(log.byUserId) || {
      name: log.byUser?.person?.name || "Sin nombre",
      redemptionsOk: 0,
      attempts: 0,
      invalid: 0,
    };

    current.attempts += 1;
    if (log.result === "OK") current.redemptionsOk += 1;
    if (log.result === "INVALID") current.invalid += 1;
    operatorMap.set(log.byUserId, current);
  });

  redemptionResultMap.forEach((total, key) => {
    redemptionResultRows.push({ key, total });
  });

  const redemptionResults = redemptionResultRows.sort((left, right) => right.total - left.total);
  const operators = Array.from(operatorMap.entries())
    .map(([userId, item]) => ({
      userId,
      name: item.name,
      redemptionsOk: item.redemptionsOk,
      attempts: item.attempts,
      invalid: item.invalid,
    }))
    .sort((left, right) => right.redemptionsOk - left.redemptionsOk || right.attempts - left.attempts)
    .slice(0, 10);

  return {
    campaign: {
      ...campaign,
      startsAt: campaign.startsAt ? campaign.startsAt.toISOString() : null,
      endsAt: campaign.endsAt ? campaign.endsAt.toISOString() : null,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    },
    generatedAt: new Date().toISOString(),
    summary: {
      participantsTotal,
      predictionsTotal,
      matchesTotal: matches.length,
      settledMatchesTotal,
      prizeCatalogTotal: prizes.length,
      activePrizeCatalogTotal: prizes.filter((prize) => prize.active).length,
      wonTotal,
      lostTotal,
      voidTotal,
      expiredPredictionTotal,
      assignedPredictionsTotal,
      winnersWithoutPrizeTotal,
      availableTotal,
      redeemedTotal,
      expiredClaimTotal,
      blockedClaimTotal,
      rejectedClaimTotal,
      winRate: percentage(wonTotal, predictionsTotal),
      redemptionRate: percentage(redeemedTotal, assignedPredictionsTotal || wonTotal),
    },
    funnel: [
      { label: "Participaron", value: predictionsTotal },
      { label: "Ganaron", value: wonTotal },
      { label: "Con premio", value: assignedPredictionsTotal },
      { label: "Disponibles", value: availableTotal },
      { label: "Canjeados", value: redeemedTotal },
      { label: "Vencidos", value: expiredClaimTotal },
    ],
    participants: participantsBreakdown,
    matches: matchesBreakdown,
    predictions: predictionsBreakdown,
    prizes: prizesBreakdown,
    redemption: {
      results: redemptionResults,
      operators,
    },
  };
}
