import { prisma } from "@/lib/prisma";

const DEFAULT_CAMPAIGN_SLUG = "mundial2026";

type ParticipantForData = {
  id: string;
  name: string;
  whatsappNormalized: string;
  createdAt: Date;
  predictions: Array<{
    createdAt: Date;
    status: "PENDING" | "WON" | "LOST" | "VOID" | "EXPIRED";
  }>;
};

export type Mundial2026WhatsappRow = {
  whatsappKey: string;
  name: string;
  whatsapp: string;
  firstParticipationAt: string;
  lastParticipationAt: string;
  participantCount: number;
  totalPredictions: number;
  won: number;
  lost: number;
  pending: number;
};

export async function getMundial2026WhatsappData(campaignSlug = DEFAULT_CAMPAIGN_SLUG) {
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

  const participants = await prisma.mundial2026Participant.findMany({
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
        },
      },
    },
  });

  const grouped = new Map<
    string,
    {
      whatsappKey: string;
      name: string;
      whatsapp: string;
      firstParticipationAt: Date;
      lastParticipationAt: Date;
      participantCount: number;
      totalPredictions: number;
      won: number;
      lost: number;
      pending: number;
      latestNameAt: Date;
    }
  >();

  for (const participant of participants as ParticipantForData[]) {
    const whatsappKey = participant.whatsappNormalized || `participant:${participant.id}`;
    const whatsapp = participant.whatsappNormalized || "Sin WhatsApp";
    const totalPredictions = participant.predictions.length;
    const won = participant.predictions.filter((prediction) => prediction.status === "WON").length;
    const lost = participant.predictions.filter((prediction) => prediction.status === "LOST").length;
    const pending = participant.predictions.filter((prediction) => prediction.status === "PENDING").length;

    const current = grouped.get(whatsappKey);
    if (!current) {
      grouped.set(whatsappKey, {
        whatsappKey,
        name: participant.name,
        whatsapp,
        firstParticipationAt: participant.createdAt,
        lastParticipationAt: participant.createdAt,
        participantCount: 1,
        totalPredictions,
        won,
        lost,
        pending,
        latestNameAt: participant.createdAt,
      });
      continue;
    }

    current.participantCount += 1;
    current.totalPredictions += totalPredictions;
    current.won += won;
    current.lost += lost;
    current.pending += pending;

    if (participant.createdAt < current.firstParticipationAt) {
      current.firstParticipationAt = participant.createdAt;
    }
    if (participant.createdAt > current.lastParticipationAt) {
      current.lastParticipationAt = participant.createdAt;
    }
    if (participant.createdAt > current.latestNameAt) {
      current.latestNameAt = participant.createdAt;
      current.name = participant.name;
    }
  }

  const rows: Mundial2026WhatsappRow[] = Array.from(grouped.values())
    .map((row) => ({
      whatsappKey: row.whatsappKey,
      name: row.name,
      whatsapp: row.whatsapp,
      firstParticipationAt: row.firstParticipationAt.toISOString(),
      lastParticipationAt: row.lastParticipationAt.toISOString(),
      participantCount: row.participantCount,
      totalPredictions: row.totalPredictions,
      won: row.won,
      lost: row.lost,
      pending: row.pending,
    }))
    .sort((left, right) => {
      if (right.totalPredictions !== left.totalPredictions) return right.totalPredictions - left.totalPredictions;
      if (right.firstParticipationAt !== left.firstParticipationAt) {
        return new Date(right.firstParticipationAt).getTime() - new Date(left.firstParticipationAt).getTime();
      }
      return left.name.localeCompare(right.name, "es");
    });

  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.uniqueWhatsapps += 1;
      accumulator.participants += row.participantCount;
      accumulator.totalPredictions += row.totalPredictions;
      accumulator.won += row.won;
      accumulator.lost += row.lost;
      accumulator.pending += row.pending;
      return accumulator;
    },
    {
      uniqueWhatsapps: 0,
      participants: 0,
      totalPredictions: 0,
      won: 0,
      lost: 0,
      pending: 0,
    }
  );

  return {
    campaign: {
      ...campaign,
      startsAt: campaign.startsAt ? campaign.startsAt.toISOString() : null,
      endsAt: campaign.endsAt ? campaign.endsAt.toISOString() : null,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    },
    generatedAt: new Date().toISOString(),
    totals,
    rows,
  };
}
