import { Mundial2026CampaignStatus } from "@prisma/client";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import {
  buildMundial2026FanZoneCode,
  buildMundial2026FanZoneUrl,
  buildMundial2026NameVerificationOptions,
  calculateMundial2026FanZoneQrCount,
  getMundial2026FanZoneExpiresAt,
  MUNDIAL2026_FANZONE_CAMPAIGN_NAME,
  MUNDIAL2026_FANZONE_LABEL,
  MUNDIAL2026_FANZONE_MAX_QR_PER_PARTICIPANT,
  MUNDIAL2026_FANZONE_THEME,
  normalizeMundial2026FanZoneVerifiedName,
  signMundial2026FanZoneQr,
} from "@/lib/mundial2026/fanzone";
import { normalizeMundial2026WhatsApp } from "@/lib/mundial2026/whatsapp";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const lookupSchema = z.object({
  whatsapp: z.string().trim().min(6, "WhatsApp requerido").max(30, "WhatsApp invalido"),
});

const issueSchema = lookupSchema.extend({
  verifiedName: z.string().trim().min(2).max(120),
});

type FanZoneCustomData = {
  issuedAt?: string;
  sequence?: number;
  totalPredictions?: number;
  eligibleQrCount?: number;
  verifiedName?: string;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: string;
};

type PublicTicket = {
  id: string;
  code: string;
  createdAt: string;
  redeemedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  redeemedBy: string | null;
  isActive: boolean;
  customerName: string;
  customerWhatsapp: string;
  customerPhrase: string | null;
  campaignName: string | null;
  redeemUrl: string;
  maxUses: number;
  usedCount: number;
};

function parseFanZoneCustomData(value: string | null): FanZoneCustomData {
  if (!value) return {};
  try {
    return JSON.parse(value) as FanZoneCustomData;
  } catch {
    return {};
  }
}

async function findActiveCampaign() {
  return prisma.mundial2026Campaign.findFirst({
    where: { slug: "mundial2026", status: Mundial2026CampaignStatus.ACTIVE },
    select: { id: true, slug: true, name: true },
  });
}

async function loadParticipantSummary(whatsappInput: string, requestUrl?: string) {
  const whatsappNormalized = normalizeMundial2026WhatsApp(whatsappInput);
  if (!whatsappNormalized) {
    return { error: apiError("INVALID_WHATSAPP", "WhatsApp invalido", {}, 400) as Response };
  }

  const campaign = await findActiveCampaign();
  if (!campaign) {
    return { error: apiError("CAMPAIGN_NOT_FOUND", "La campaña Mundial 2026 no está activa.", {}, 404) as Response };
  }

  const participant = await prisma.mundial2026Participant.findUnique({
    where: {
      campaignId_whatsappNormalized: {
        campaignId: campaign.id,
        whatsappNormalized,
      },
    },
    select: {
      id: true,
      name: true,
      whatsappRaw: true,
      whatsappNormalized: true,
      createdAt: true,
      predictions: {
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!participant) {
    return {
      error: apiError("PARTICIPANT_NOT_FOUND", "No encontramos ese WhatsApp en Mundial 2026.", { whatsapp: whatsappNormalized }, 404) as Response,
    };
  }

  const totalPredictions = participant.predictions.length;
  const won = participant.predictions.filter((prediction) => prediction.status === "WON").length;
  const lost = participant.predictions.filter((prediction) => prediction.status === "LOST").length;
  const pending = participant.predictions.filter((prediction) => prediction.status === "PENDING").length;
  const voided = participant.predictions.filter((prediction) => prediction.status === "VOID").length;
  const expired = participant.predictions.filter((prediction) => prediction.status === "EXPIRED").length;
  const eligibleQrCount = calculateMundial2026FanZoneQrCount(totalPredictions);
  const verificationOptions = buildMundial2026NameVerificationOptions(participant.name);

  const storedTickets = await prisma.customQr.findMany({
    where: {
      customerWhatsapp: whatsappNormalized,
      campaignName: MUNDIAL2026_FANZONE_CAMPAIGN_NAME,
      revokedAt: null,
    },
    select: {
      id: true,
      code: true,
      createdAt: true,
      redeemedAt: true,
      revokedAt: true,
      expiresAt: true,
      redeemedBy: true,
      isActive: true,
      customerName: true,
      customerWhatsapp: true,
      customerPhrase: true,
      campaignName: true,
      customData: true,
    },
    orderBy: { createdAt: "asc" },
    take: 1,
  });

  const tickets = storedTickets.map((ticket) => {
    const metadata = parseFanZoneCustomData(ticket.customData);
    const maxUses = Math.min(
      MUNDIAL2026_FANZONE_MAX_QR_PER_PARTICIPANT,
      Math.max(1, metadata.maxUses ?? eligibleQrCount ?? 1)
    );
    const usedCount = Math.min(maxUses, Math.max(0, metadata.usedCount ?? 0));
    return {
      id: ticket.id,
      code: ticket.code,
      createdAt: ticket.createdAt.toISOString(),
      redeemedAt: ticket.redeemedAt ? ticket.redeemedAt.toISOString() : null,
      revokedAt: ticket.revokedAt ? ticket.revokedAt.toISOString() : null,
      expiresAt: ticket.expiresAt ? ticket.expiresAt.toISOString() : null,
      redeemedBy: ticket.redeemedBy,
      isActive: ticket.isActive,
      customerName: ticket.customerName,
      customerWhatsapp: ticket.customerWhatsapp,
      customerPhrase: ticket.customerPhrase,
      campaignName: ticket.campaignName,
      redeemUrl: buildMundial2026FanZoneUrl({ code: ticket.code, urlOrReq: requestUrl }),
      maxUses,
      usedCount,
    } satisfies PublicTicket;
  });

  const issuedQrCount = tickets.length > 0 ? 1 : 0;

  return {
    participant: {
      id: participant.id,
      name: participant.name,
      whatsappRaw: participant.whatsappRaw,
      whatsappNormalized: participant.whatsappNormalized,
      createdAt: participant.createdAt.toISOString(),
    },
    verificationOptions,
    stats: {
      totalPredictions,
      won,
      lost,
      pending,
      voided,
      expired,
    },
    entitlement: {
      eligibleQrCount,
      issuedQrCount,
      remainingQrCount: tickets.length > 0 ? 0 : 1,
    },
    tickets,
    courtesy: {
      label: MUNDIAL2026_FANZONE_LABEL,
      theme: MUNDIAL2026_FANZONE_THEME,
    },
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = lookupSchema.safeParse({
      whatsapp: url.searchParams.get("whatsapp") || "",
    });
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos invalidos", parsed.error.flatten(), 400);
    }

    const result = await loadParticipantSummary(parsed.data.whatsapp, req.url);
    if ("error" in result) return result.error;

    return apiOk(result);
  } catch (error) {
    console.error("[api/mundial2026/fanzone] GET error", error);
    return apiError("INTERNAL_ERROR", "No se pudo cargar la fan zone.", {}, 500);
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = issueSchema.safeParse({
      whatsapp: json?.whatsapp ?? "",
      verifiedName: json?.verifiedName ?? "",
    });

    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos invalidos", parsed.error.flatten(), 400);
    }

    const summary = await loadParticipantSummary(parsed.data.whatsapp, req.url);
    if ("error" in summary) return summary.error;

    const selectedName = normalizeMundial2026FanZoneVerifiedName(parsed.data.verifiedName);
    const registeredName = normalizeMundial2026FanZoneVerifiedName(summary.participant.name);
    if (selectedName !== registeredName) {
      return apiError("INVALID_VERIFICATION", "Selecciona exactamente el nombre con el que jugaste.", {}, 400);
    }

    if (summary.tickets.length > 0) {
      return apiOk({
        ...summary,
        createdCount: 0,
        issuedAt: summary.tickets[0].createdAt,
      });
    }

    const eligibleUses = Math.min(MUNDIAL2026_FANZONE_MAX_QR_PER_PARTICIPANT, Math.max(1, summary.entitlement.eligibleQrCount));
    const issuedAt = new Date().toISOString();
    const expiresAt = getMundial2026FanZoneExpiresAt();
    const code = buildMundial2026FanZoneCode();
    const signature = signMundial2026FanZoneQr({
      code,
      customerWhatsapp: summary.participant.whatsappNormalized,
      sequence: 1,
      totalPredictions: summary.stats.totalPredictions,
      eligibleQrCount: summary.entitlement.eligibleQrCount,
    });

    const record = await prisma.customQr.create({
      data: {
        customerName: summary.participant.name,
        customerWhatsapp: summary.participant.whatsappNormalized,
        customerPhrase: MUNDIAL2026_FANZONE_LABEL,
        customData: JSON.stringify({
          campaignSlug: "mundial2026",
          campaignName: MUNDIAL2026_FANZONE_CAMPAIGN_NAME,
          issuedAt,
          sequence: 1,
          totalPredictions: summary.stats.totalPredictions,
          eligibleQrCount: summary.entitlement.eligibleQrCount,
          verifiedName: parsed.data.verifiedName,
          maxUses: eligibleUses,
          usedCount: 0,
          expiresAt: expiresAt.toISOString(),
        }),
        theme: MUNDIAL2026_FANZONE_THEME,
        code,
        signature,
        campaignName: MUNDIAL2026_FANZONE_CAMPAIGN_NAME,
        isActive: true,
        expiresAt,
      },
      select: {
        id: true,
        code: true,
        createdAt: true,
        redeemedAt: true,
        revokedAt: true,
        expiresAt: true,
        redeemedBy: true,
        isActive: true,
        customerName: true,
        customerWhatsapp: true,
        customerPhrase: true,
        campaignName: true,
        customData: true,
      },
    });

    const metadata = parseFanZoneCustomData(record.customData);
    const createdTicket: PublicTicket = {
      id: record.id,
      code: record.code,
      createdAt: record.createdAt.toISOString(),
      redeemedAt: record.redeemedAt ? record.redeemedAt.toISOString() : null,
      revokedAt: record.revokedAt ? record.revokedAt.toISOString() : null,
      expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
      redeemedBy: record.redeemedBy,
      isActive: record.isActive,
      customerName: record.customerName,
      customerWhatsapp: record.customerWhatsapp,
      customerPhrase: record.customerPhrase,
      campaignName: record.campaignName,
      redeemUrl: buildMundial2026FanZoneUrl({ code: record.code, urlOrReq: req.url }),
      maxUses: Math.max(1, metadata.maxUses ?? eligibleUses),
      usedCount: Math.max(0, metadata.usedCount ?? 0),
    };

    return apiOk({
      ...summary,
      tickets: [createdTicket],
      createdCount: 1,
      issuedAt,
    }, 201);
  } catch (error) {
    console.error("[api/mundial2026/fanzone] POST error", error);
    return apiError("INTERNAL_ERROR", "No se pudieron emitir los QR.", {}, 500);
  }
}
