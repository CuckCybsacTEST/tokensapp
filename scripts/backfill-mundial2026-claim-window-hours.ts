import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CAMPAIGN_SLUG = "mundial2026";
const TARGET_CLAIM_WINDOW_HOURS = 48;

async function main() {
  const campaign = await prisma.mundial2026Campaign.findUnique({
    where: { slug: CAMPAIGN_SLUG },
    select: { id: true, slug: true },
  });

  if (!campaign) {
    throw new Error(`Campaign '${CAMPAIGN_SLUG}' not found`);
  }

  const result = await prisma.mundial2026Prize.updateMany({
    where: {
      campaignId: campaign.id,
      OR: [{ claimWindowHours: { not: TARGET_CLAIM_WINDOW_HOURS } }, { claimWindowHours: null }],
    },
    data: {
      claimWindowHours: TARGET_CLAIM_WINDOW_HOURS,
    },
  });

  console.log(
    `[backfill-mundial2026-claim-window-hours] campaign=${campaign.slug} updated=${result.count} target=${TARGET_CLAIM_WINDOW_HOURS}h`
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
