import { Mundial2026PrizeAssignmentMode, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CAMPAIGN_SLUG = "mundial2026";
const START_MATCH_NUMBER = 2;

const ORDERED_PRIZE_LABELS = [
  "Copa Chilcano — S/5",
  "Six Pack Mundialista — S/29.90",
  "Jarra Cuba Libre 1L — S/9.90",
  "Cerveza Personal — S/5",
  "Jäger Boom 2x1 — S/19.90",
  "Jarra Mojito — GRATIS",
  "Jarrita Apple Green — S/9.90",
  "Jarra Andino 1L — S/9.90",
  "Russkaya — S/29.90",
  "Jäger Boom — GRATIS",
  "Copa Daiquiri de Fresa — S/5",
  "Habana Club Añejo — S/29.90",
  "Jarra Pantera Rosa — S/9.90",
  "Copa Cuba Libre — GRATIS",
  "50% menos en la segunda jarra",
  "Jarra Chilcano — GRATIS",
  "Jarra Charapita 1L — S/9.90",
  "Jarra Mora Azul — GRATIS",
  "Copa Chilcano — S/5",
  "Jarra Mora Azul 1L — S/9.90",
  "2x1 — Todas las jarras",
  "Corona Personal — GRATIS",
  "Habana Club Añejo — S/29.90",
  "Cerveza Personal — S/5",
  "Six Pack Mundialista — S/29.90",
  "Jarra Charapita 1L — S/9.90",
  "Ktdral Boom 3L — S/9.90",
  "Jarra Cuba Libre — GRATIS",
  "Jarra Andino 1L — S/9.90",
  "Russkaya — S/29.90",
  "Jarra Cuba Libre 1L — S/9.90",
  "Jäger Boom 2x1 — S/19.90",
  "Copa Daiquiri de Fresa — S/5",
  "Jäger Boom — GRATIS",
  "Premio Sorpresa",
  "Habana Club Añejo — S/29.90",
  "Jarra Pantera Rosa — S/9.90",
  "50% menos en la segunda jarra",
  "Copa Mojito — GRATIS",
  "Jarra Chilcano — GRATIS",
  "2x1 — Todas las jarras",
  "Russkaya — S/29.90",
  "Jarrita Apple Green — S/9.90",
  "Corona Personal — GRATIS",
  "Six Pack Mundialista — S/29.90",
  "Jäger Boom 2x1 — S/19.90",
  "Jarra Cuba Libre 1L — S/9.90",
  "Jarra Mojito — GRATIS",
  "Copa Chilcano — S/5",
  "Jarra Charapita 1L — S/9.90",
  "Premio Sorpresa",
  "Ktdral Boom 3L — S/9.90",
  "Cerveza Personal — S/5",
  "Jarra Mora Azul 1L — S/9.90",
  "Russkaya — S/29.90",
  "Jäger Boom — GRATIS",
  "Copa Cuba Libre — GRATIS",
  "50% menos en la segunda jarra",
  "Jarra Andino 1L — S/9.90",
  "Jarra Chilcano — GRATIS",
  "Copa Daiquiri de Fresa — S/5",
  "Six Pack Mundialista — S/29.90",
  "Habana Club Añejo — S/29.90",
  "Corona Personal — GRATIS",
  "2x1 — Todas las jarras",
  "Jarra Cuba Libre — GRATIS",
  "Jarra Pantera Rosa — S/9.90",
  "Copa Chilcano — GRATIS",
  "Jarra Mora Azul — GRATIS",
  "Habana Club Añejo — S/29.90",
  "Premio Sorpresa",
] as const;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/s\/\//g, "soles-")
    .replace(/%/g, "porciento")
    .replace(/2x1/g, "dos-por-uno")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getPrizeColor(label: string) {
  if (/gratis/i.test(label)) return "#22C55E";
  if (/sorpresa/i.test(label)) return "#F59E0B";
  if (/2x1|50%/i.test(label)) return "#38BDF8";
  if (/jager|ktdral boom|russkaya|habana/i.test(label)) return "#3B82F6";
  if (/cerveza|corona|six pack/i.test(label)) return "#FACC15";
  if (/mojito|chilcano|daiquiri|cuba libre|pantera rosa|mora azul|andino|charapita|apple green/i.test(label)) return "#60A5FA";
  return "#94A3B8";
}

function getPrizeDescription(label: string) {
  if (/gratis/i.test(label)) return "Premio promocional sin costo para reclamar en Ktdral Lounge.";
  if (/2x1|50%/i.test(label)) return "Beneficio promocional aplicable al premio indicado para este partido.";
  if (/sorpresa/i.test(label)) return "Premio sorpresa definido por la casa para este partido.";
  return "Premio promocional asignado a este partido del Mundial 2026.";
}

async function main() {
  const campaign = await prisma.mundial2026Campaign.findUnique({
    where: { slug: CAMPAIGN_SLUG },
    select: { id: true, slug: true },
  });

  if (!campaign) {
    throw new Error(`Campaign '${CAMPAIGN_SLUG}' not found`);
  }

  const targetMatchNumbers = ORDERED_PRIZE_LABELS.map((_, index) => START_MATCH_NUMBER + index);
  const targetExternalKeys = targetMatchNumbers.map((matchNumber) => `fwc26-match-${String(matchNumber).padStart(3, "0")}`);

  const matches = await prisma.mundial2026Match.findMany({
    where: {
      campaignId: campaign.id,
      externalKey: { in: targetExternalKeys },
    },
    select: {
      id: true,
      externalKey: true,
      homeTeam: true,
      awayTeam: true,
    },
  });

  if (matches.length !== ORDERED_PRIZE_LABELS.length) {
    throw new Error(`Expected ${ORDERED_PRIZE_LABELS.length} matches from ${targetExternalKeys[0]} to ${targetExternalKeys.at(-1)}, found ${matches.length}`);
  }

  const matchesByExternalKey = new Map(matches.map((match) => [match.externalKey, match]));
  const uniquePrizeLabels = Array.from(new Set(ORDERED_PRIZE_LABELS));
  const appearanceCountByLabel = new Map<string, number>();
  const firstIndexByLabel = new Map<string, number>();

  ORDERED_PRIZE_LABELS.forEach((label, index) => {
    appearanceCountByLabel.set(label, (appearanceCountByLabel.get(label) ?? 0) + 1);
    if (!firstIndexByLabel.has(label)) {
      firstIndexByLabel.set(label, index);
    }
  });

  const prizeIdByLabel = new Map<string, string>();

  for (const label of uniquePrizeLabels) {
    const key = `fixture-${slugify(label)}`;
    const savedPrize = await prisma.mundial2026Prize.upsert({
      where: {
        campaignId_key: {
          campaignId: campaign.id,
          key,
        },
      },
      update: {
        label,
        description: getPrizeDescription(label),
        color: getPrizeColor(label),
        stockTotal: appearanceCountByLabel.get(label) ?? 1,
        active: true,
        priority: 1000 - (firstIndexByLabel.get(label) ?? 0),
        claimWindowHours: 24,
      },
      create: {
        campaignId: campaign.id,
        key,
        label,
        description: getPrizeDescription(label),
        color: getPrizeColor(label),
        stockTotal: appearanceCountByLabel.get(label) ?? 1,
        active: true,
        priority: 1000 - (firstIndexByLabel.get(label) ?? 0),
        claimWindowHours: 24,
      },
      select: { id: true },
    });

    prizeIdByLabel.set(label, savedPrize.id);
  }

  await prisma.mundial2026MatchPrize.deleteMany({
    where: {
      match: {
        campaignId: campaign.id,
        externalKey: { in: targetExternalKeys },
      },
    },
  });

  for (const [index, label] of ORDERED_PRIZE_LABELS.entries()) {
    const matchNumber = START_MATCH_NUMBER + index;
    const externalKey = `fwc26-match-${String(matchNumber).padStart(3, "0")}`;
    const match = matchesByExternalKey.get(externalKey);
    const prizeId = prizeIdByLabel.get(label);

    if (!match || !prizeId) {
      throw new Error(`Missing data for assignment externalKey=${externalKey} label='${label}'`);
    }

    await prisma.mundial2026MatchPrize.create({
      data: {
        matchId: match.id,
        prizeId,
        assignmentMode: Mundial2026PrizeAssignmentMode.DIRECT_FIRST_N,
        maxWinners: 1,
        sortOrder: 0,
        active: true,
      },
    });
  }

  const assignedRows = targetMatchNumbers.map((matchNumber, index) => {
    const externalKey = `fwc26-match-${String(matchNumber).padStart(3, "0")}`;
    const match = matchesByExternalKey.get(externalKey);
    return {
      matchNumber,
      externalKey,
      fixture: match ? `${match.homeTeam} vs ${match.awayTeam}` : "(missing match)",
      prize: ORDERED_PRIZE_LABELS[index],
    };
  });

  console.log(`[assign-mundial2026-ordered-prizes] campaign=${campaign.slug} uniquePrizes=${uniquePrizeLabels.length} assignedMatches=${assignedRows.length} skippedMatch=1`);
  assignedRows.slice(0, 8).forEach((row) => {
    console.log(`[assign-mundial2026-ordered-prizes] match=${row.matchNumber} ${row.fixture} -> ${row.prize}`);
  });
  console.log(`[assign-mundial2026-ordered-prizes] ... lastMatch=${assignedRows.at(-1)?.matchNumber} -> ${assignedRows.at(-1)?.prize}`);
}

main()
  .catch((error) => {
    console.error("[assign-mundial2026-ordered-prizes] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });