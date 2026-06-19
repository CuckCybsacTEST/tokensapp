import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_CAMPAIGN_SLUG = "mundial2026";
const PRIZE_COLOR_PALETTE = ["#F97316", "#EF4444", "#EAB308", "#22C55E", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899"];

const createPrizeSchema = z.object({
  key: z.string().trim().min(2, "Clave requerida").max(80, "Clave demasiado larga"),
  label: z.string().trim().min(2, "Label requerido").max(120, "Label demasiado largo"),
  description: z.string().trim().max(280, "Descripción demasiado larga").optional().or(z.literal("")),
  stockTotal: z.coerce.number().int().min(1, "Stock debe ser mayor a 0").nullable().optional(),
  priority: z.coerce.number().int().min(0).max(999).default(0),
  claimWindowHours: z.coerce.number().int().min(1).max(720).default(48),
  active: z.coerce.boolean().default(true),
});

function getRandomPrizeColor() {
  return PRIZE_COLOR_PALETTE[Math.floor(Math.random() * PRIZE_COLOR_PALETTE.length)] ?? "#3B82F6";
}

async function getCampaign() {
  return prisma.mundial2026Campaign.findFirst({
    where: { slug: DEFAULT_CAMPAIGN_SLUG },
    select: { id: true, slug: true, name: true },
  });
}

export async function GET() {
  try {
    const campaign = await getCampaign();
    if (!campaign) {
      return apiError("CAMPAIGN_NOT_FOUND", "Campaña Mundial 2026 no encontrada.", {}, 404);
    }

    const prizes = await prisma.mundial2026Prize.findMany({
      where: { campaignId: campaign.id },
      orderBy: [{ active: "desc" }, { priority: "desc" }, { label: "asc" }],
      include: {
        _count: {
          select: {
            matchPrizes: true,
            assignedPredictions: true,
          },
        },
      },
    });

    return apiOk({
      campaign,
      prizes: prizes.map((prize) => ({
        id: prize.id,
        key: prize.key,
        label: prize.label,
        description: prize.description,
        color: prize.color,
        stockTotal: prize.stockTotal,
        stockReserved: prize.stockReserved,
        stockClaimed: prize.stockClaimed,
        priority: prize.priority,
        claimWindowHours: prize.claimWindowHours,
        active: prize.active,
        assignedMatches: prize._count.matchPrizes,
        assignedPredictions: prize._count.assignedPredictions,
      })),
    });
  } catch (error) {
    console.error("Error listing Mundial 2026 prizes:", error);
    return apiError("INTERNAL_ERROR", "No se pudieron cargar los premios de Mundial 2026.", {}, 500);
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = createPrizeSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos para el premio.", parsed.error.flatten(), 400);
    }

    const campaign = await getCampaign();
    if (!campaign) {
      return apiError("CAMPAIGN_NOT_FOUND", "Campaña Mundial 2026 no encontrada.", {}, 404);
    }

    const prize = await prisma.mundial2026Prize.create({
      data: {
        campaignId: campaign.id,
        key: parsed.data.key,
        label: parsed.data.label,
        description: parsed.data.description || null,
        color: getRandomPrizeColor(),
        stockTotal: parsed.data.stockTotal ?? null,
        priority: parsed.data.priority,
        claimWindowHours: parsed.data.claimWindowHours,
        active: parsed.data.active,
      },
    });

    return apiOk({ prize }, 201);
  } catch (error) {
    console.error("Error creating Mundial 2026 prize:", error);
    const message = error instanceof Error ? error.message : "No se pudo crear el premio.";
    const status = message.includes("Unique constraint") ? 409 : 500;
    return apiError("CREATE_FAILED", status === 409 ? "Ya existe un premio con esa clave." : message, {}, status);
  }
}
