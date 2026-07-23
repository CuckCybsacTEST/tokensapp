import { Mundial2026CampaignStatus } from "@prisma/client";
import type { CustomQr } from "@prisma/client";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import {
  buildMundial2026FanZoneCode,
  buildMundial2026FanZoneUrl,
  buildMundial2026NameVerificationOptions,
  calculateMundial2026FanZoneQrCount,
  MUNDIAL2026_FANZONE_CAMPAIGN_NAME,
  MUNDIAL2026_FANZONE_LABEL,
  MUNDIAL2026_FANZONE_THEME,
  normalizeMundial2026FanZoneQuery,
  signMundial2026FanZoneQr,
} from "@/lib/mundial2026/fanzone";
import { normalizeMundial2026WhatsApp } from "@/lib/mundial2026/whatsapp";
import { getSessionCookieFromRequest, requireRole, verifySessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const lookupSchema = z.object({
  whatsapp: z.string().trim().min(6, "WhatsApp requerido").max(30, "WhatsApp invalido"),
});

const issueSchema = lookupSchema.extend({
  count: z.coerce.number().int().min(1).max(100).optional(),
  verifiedName: z.string().trim().min(2).max(120).optional(),
});

type FanZoneTicket = Pick<CustomQr, "id" | "code" | "createdAt" | "redeemedAt" | "isActive" | "revokedAt" | "customerName" | "customerWhatsapp" | "customerPhrase" | "campaignName">;

async function requireAdmin(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  if (!session) {
    return { ok: false as const, response: apiError("UNAUTHORIZED", "UNAUTHORIZED", undefined, 401) };
  }

  const roleCheck = requireRole(session, ["ADMIN", "COORDINATOR"]);
  if (!roleCheck.ok) {
    return { ok: false as const, response: apiError("FORBIDDEN", "FORBIDDEN", undefined, 403) };
  }

  return { ok: true as const, session };
}

async function loadParticipantSummary(whatsappInput: string, requestUrl?: string) {
  const whatsappNormalized = normalizeMundial2026WhatsApp(whatsappInput);
  if (!whatsappNormalized) {
    return { error: apiError("INVALID_WHATSAPP", "WhatsApp invalido", {}, 400) as Response };
  }

  const campaign = await prisma.mundial2026Campaign.findFirst({
    where: {
      slug: "mundial2026",
      status: Mundial2026CampaignStatus.ACTIVE,
    },
    select: {
      id: true,
      slug: true,
    },
  });

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

  const issuedQrCount = await prisma.customQr.count({
    where: {
      customerWhatsapp: whatsappNormalized,
      campaignName: MUNDIAL2026_FANZONE_CAMPAIGN_NAME,
      revokedAt: null,
    },
  });

  const tickets = await prisma.customQr.findMany({
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
      isActive: true,
      revokedAt: true,
      customerName: true,
      customerWhatsapp: true,
      customerPhrase: true,
      campaignName: true,
    },
    orderBy: { createdAt: "asc" },
  });

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
      remainingQrCount: Math.max(0, eligibleQrCount - issuedQrCount),
    },
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      code: ticket.code,
      createdAt: ticket.createdAt.toISOString(),
      redeemedAt: ticket.redeemedAt ? ticket.redeemedAt.toISOString() : null,
      isActive: ticket.isActive,
      revokedAt: ticket.revokedAt ? ticket.revokedAt.toISOString() : null,
      customerName: ticket.customerName,
      customerWhatsapp: ticket.customerWhatsapp,
      customerPhrase: ticket.customerPhrase,
      campaignName: ticket.campaignName,
      redeemUrl: buildMundial2026FanZoneUrl({ code: ticket.code, urlOrReq: requestUrl }),
    })),
  };
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const parsed = lookupSchema.safeParse({
      whatsapp: normalizeMundial2026FanZoneQuery(url.searchParams.get("whatsapp") || ""),
    });
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos invalidos", parsed.error.flatten(), 400);
    }

    const result = await loadParticipantSummary(parsed.data.whatsapp, req.url);
    if ("error" in result) return result.error;

    return apiOk({
      ...result,
      courtesy: {
        label: MUNDIAL2026_FANZONE_LABEL,
        theme: MUNDIAL2026_FANZONE_THEME,
      },
    });
  } catch (error) {
    console.error("[api/admin/mundial2026/fanzone] GET error", error);
    return apiError("INTERNAL_ERROR", "No se pudo cargar la fan zone.", {}, 500);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const json = await req.json();
    const parsed = issueSchema.safeParse({
      whatsapp: normalizeMundial2026FanZoneQuery(json?.whatsapp ?? ""),
      count: json?.count,
      verifiedName: normalizeMundial2026FanZoneQuery(json?.verifiedName ?? ""),
    });

    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos invalidos", parsed.error.flatten(), 400);
    }

    const summary = await loadParticipantSummary(parsed.data.whatsapp, req.url);
    if ("error" in summary) return summary.error;

    const verificationOptions = buildMundial2026NameVerificationOptions(summary.participant.name);
    const verifiedName = parsed.data.verifiedName || summary.participant.name;
    if (!verificationOptions.includes(verifiedName)) {
      return apiError("INVALID_VERIFICATION", "Selecciona uno de los nombres sugeridos para verificar la identidad.", {
        verificationOptions,
      }, 400);
    }

    const remaining = summary.entitlement.remainingQrCount;
    if (remaining <= 0) {
      return apiError("NO_ENTITLEMENT", "Este WhatsApp ya agotó su cupo de QR.", {
        whatsapp: summary.participant.whatsappNormalized,
        eligibleQrCount: summary.entitlement.eligibleQrCount,
        issuedQrCount: summary.entitlement.issuedQrCount,
      }, 409);
    }

    const countToIssue = Math.min(parsed.data.count ?? remaining, remaining);
    const issuedAt = new Date().toISOString();

    const createdTickets = await prisma.$transaction(async (tx) => {
      const batch: FanZoneTicket[] = [];
      for (let index = 0; index < countToIssue; index += 1) {
        const code = buildMundial2026FanZoneCode();
        const sequence = summary.entitlement.issuedQrCount + index + 1;
        const signature = signMundial2026FanZoneQr({
          code,
          customerWhatsapp: summary.participant.whatsappNormalized,
          sequence,
          totalPredictions: summary.stats.totalPredictions,
          eligibleQrCount: summary.entitlement.eligibleQrCount,
        });

        const record = await tx.customQr.create({
          data: {
            customerName: summary.participant.name,
            customerWhatsapp: summary.participant.whatsappNormalized,
            customerPhrase: MUNDIAL2026_FANZONE_LABEL,
            customData: JSON.stringify({
              campaignSlug: "mundial2026",
              campaignName: MUNDIAL2026_FANZONE_CAMPAIGN_NAME,
              issuedAt,
              sequence,
              totalPredictions: summary.stats.totalPredictions,
              eligibleQrCount: summary.entitlement.eligibleQrCount,
              verifiedName,
            }),
            theme: MUNDIAL2026_FANZONE_THEME,
            code,
            signature,
            campaignName: MUNDIAL2026_FANZONE_CAMPAIGN_NAME,
            isActive: true,
          },
          select: {
            id: true,
            code: true,
            createdAt: true,
            redeemedAt: true,
            isActive: true,
            revokedAt: true,
            customerName: true,
            customerWhatsapp: true,
            customerPhrase: true,
            campaignName: true,
          },
        });

        batch.push(record);
      }

      return batch;
    });

    const tickets = createdTickets.map((ticket) => ({
      id: ticket.id,
      code: ticket.code,
      createdAt: ticket.createdAt.toISOString(),
      redeemedAt: ticket.redeemedAt ? ticket.redeemedAt.toISOString() : null,
      isActive: ticket.isActive,
      revokedAt: ticket.revokedAt ? ticket.revokedAt.toISOString() : null,
      customerName: ticket.customerName,
      customerWhatsapp: ticket.customerWhatsapp,
      customerPhrase: ticket.customerPhrase,
      campaignName: ticket.campaignName,
      redeemUrl: buildMundial2026FanZoneUrl({ code: ticket.code, urlOrReq: req.url }),
    }));

    return apiOk({
      ...summary,
      tickets: [...summary.tickets, ...tickets],
      createdCount: tickets.length,
      verificationOptions,
      courtesy: {
        label: MUNDIAL2026_FANZONE_LABEL,
        theme: MUNDIAL2026_FANZONE_THEME,
      },
    }, 201);
  } catch (error) {
    console.error("[api/admin/mundial2026/fanzone] POST error", error);
    return apiError("INTERNAL_ERROR", "No se pudieron emitir los QR.", {}, 500);
  }
}
