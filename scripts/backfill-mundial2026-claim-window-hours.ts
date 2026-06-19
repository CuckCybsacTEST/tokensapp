import "dotenv/config";

import { Mundial2026ClaimStatus, Mundial2026PredictionStatus, PrismaClient } from "@prisma/client";

import { MUNDIAL2026_CLAIM_WINDOW_HOURS } from "../src/lib/mundial2026/time";

const prisma = new PrismaClient();
const CAMPAIGN_SLUG = "mundial2026";

async function main() {
  const campaign = await prisma.mundial2026Campaign.findUnique({
    where: { slug: CAMPAIGN_SLUG },
    select: { id: true, slug: true },
  });

  if (!campaign) {
    throw new Error(`Campaign '${CAMPAIGN_SLUG}' not found`);
  }

  const prizeWindowResult = await prisma.mundial2026Prize.updateMany({
    where: {
      campaignId: campaign.id,
      claimWindowHours: { not: MUNDIAL2026_CLAIM_WINDOW_HOURS },
    },
    data: {
      claimWindowHours: MUNDIAL2026_CLAIM_WINDOW_HOURS,
    },
  });

  const candidates = await prisma.mundial2026Prediction.findMany({
    where: {
      campaignId: campaign.id,
      status: Mundial2026PredictionStatus.WON,
      assignedPrizeId: { not: null },
      match: {
        settledAt: { not: null },
      },
    },
    select: {
      id: true,
      claimStatus: true,
      availableAt: true,
      claimExpiresAt: true,
      redeemedAt: true,
      match: {
        select: {
          settledAt: true,
        },
      },
    },
  });

  const now = new Date();
  let predictionUpdates = 0;
  let reopened = 0;
  let expired = 0;

  for (const prediction of candidates) {
    const settledAt = prediction.match.settledAt;
    if (!settledAt) continue;

    const nextExpiresAt = new Date(settledAt.getTime() + MUNDIAL2026_CLAIM_WINDOW_HOURS * 60 * 60 * 1000);
    const nextClaimStatus =
      prediction.redeemedAt || prediction.claimStatus === Mundial2026ClaimStatus.REDEEMED
        ? Mundial2026ClaimStatus.REDEEMED
        : nextExpiresAt.getTime() <= now.getTime()
          ? Mundial2026ClaimStatus.EXPIRED
          : Mundial2026ClaimStatus.AVAILABLE;
    const nextAvailableAt = prediction.availableAt ?? settledAt;

    const needsUpdate =
      prediction.claimStatus !== nextClaimStatus ||
      prediction.claimExpiresAt?.getTime() !== nextExpiresAt.getTime() ||
      prediction.availableAt?.getTime() !== nextAvailableAt.getTime();

    if (!needsUpdate) continue;

    await prisma.mundial2026Prediction.update({
      where: { id: prediction.id },
      data: {
        claimStatus: nextClaimStatus,
        availableAt: nextAvailableAt,
        claimExpiresAt: nextExpiresAt,
      },
    });

    predictionUpdates += 1;
    if (nextClaimStatus === Mundial2026ClaimStatus.AVAILABLE) reopened += 1;
    if (nextClaimStatus === Mundial2026ClaimStatus.EXPIRED) expired += 1;
  }

  console.log(
    `[backfill-mundial2026-claim-window-hours] campaign=${campaign.slug} prizes=${prizeWindowResult.count} predictions=${predictionUpdates} reopened=${reopened} expired=${expired} target=${MUNDIAL2026_CLAIM_WINDOW_HOURS}h`
  );
}

main()
  .catch((error) => {
    console.error("[backfill-mundial2026-claim-window-hours] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
