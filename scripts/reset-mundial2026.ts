import { Mundial2026MatchStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CAMPAIGN_SLUG = "mundial2026";

async function main() {
  const campaign = await prisma.mundial2026Campaign.findUnique({
    where: { slug: CAMPAIGN_SLUG },
    select: { id: true, slug: true },
  });

  if (!campaign) {
    console.log(`[reset-mundial2026] campaign '${CAMPAIGN_SLUG}' not found`);
    return;
  }

  const matches = await prisma.mundial2026Match.findMany({
    where: { campaignId: campaign.id },
    select: { id: true, predictionClosesAt: true },
    orderBy: { startsAt: "asc" },
  });

  const nowMs = Date.now();

  await prisma.$transaction([
    prisma.mundial2026RedemptionLog.deleteMany({
      where: {
        prediction: {
          campaignId: campaign.id,
        },
      },
    }),
    prisma.mundial2026Prediction.deleteMany({ where: { campaignId: campaign.id } }),
    prisma.mundial2026Participant.deleteMany({ where: { campaignId: campaign.id } }),
    prisma.mundial2026MatchPrize.deleteMany({
      where: {
        match: {
          campaignId: campaign.id,
        },
      },
    }),
    prisma.mundial2026Prize.deleteMany({ where: { campaignId: campaign.id } }),
    ...matches.map((match) =>
      prisma.mundial2026Match.update({
        where: { id: match.id },
        data: {
          result: null,
          settledAt: null,
          status: match.predictionClosesAt.getTime() > nowMs ? Mundial2026MatchStatus.OPEN : Mundial2026MatchStatus.CLOSED,
        },
      })
    ),
  ]);

  const [prizes, matchPrizes, participants, predictions, redemptions, settled] = await Promise.all([
    prisma.mundial2026Prize.count({ where: { campaignId: campaign.id } }),
    prisma.mundial2026MatchPrize.count({
      where: {
        match: {
          campaignId: campaign.id,
        },
      },
    }),
    prisma.mundial2026Participant.count({ where: { campaignId: campaign.id } }),
    prisma.mundial2026Prediction.count({ where: { campaignId: campaign.id } }),
    prisma.mundial2026RedemptionLog.count({
      where: {
        prediction: {
          campaignId: campaign.id,
        },
      },
    }),
    prisma.mundial2026Match.count({
      where: {
        campaignId: campaign.id,
        settledAt: { not: null },
      },
    }),
  ]);

  console.log(
    `[reset-mundial2026] campaign=${campaign.slug} matches=${matches.length} prizes=${prizes} matchPrizes=${matchPrizes} participants=${participants} predictions=${predictions} redemptions=${redemptions} settled=${settled}`
  );
}

main()
  .catch((error) => {
    console.error("[reset-mundial2026] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });