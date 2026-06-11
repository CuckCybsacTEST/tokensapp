import { Mundial2026PrizeAssignmentMode } from "@prisma/client";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const createMatchPrizeSchema = z.object({
  prizeId: z.string().trim().min(1),
  assignmentMode: z.enum(["DIRECT_FIRST_N", "RAFFLE"]),
  maxWinners: z.coerce.number().int().min(1).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.coerce.boolean().default(true),
});

export async function POST(req: Request, { params }: { params: { matchId: string } }) {
  try {
    const json = await req.json();
    const parsed = createMatchPrizeSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos para asignar el premio.", parsed.error.flatten(), 400);
    }

    const [match, prize] = await Promise.all([
      prisma.mundial2026Match.findUnique({ where: { id: params.matchId }, select: { id: true, campaignId: true } }),
      prisma.mundial2026Prize.findUnique({ where: { id: parsed.data.prizeId }, select: { id: true, campaignId: true } }),
    ]);

    if (!match) {
      return apiError("MATCH_NOT_FOUND", "Partido no encontrado.", { matchId: params.matchId }, 404);
    }
    if (!prize || prize.campaignId !== match.campaignId) {
      return apiError("PRIZE_NOT_FOUND", "Premio no encontrado para esta campaña.", { prizeId: parsed.data.prizeId }, 404);
    }

    const matchPrize = await prisma.mundial2026MatchPrize.upsert({
      where: {
        matchId_prizeId: {
          matchId: params.matchId,
          prizeId: parsed.data.prizeId,
        },
      },
      update: {
        assignmentMode: parsed.data.assignmentMode as Mundial2026PrizeAssignmentMode,
        maxWinners: parsed.data.maxWinners ?? null,
        sortOrder: parsed.data.sortOrder,
        active: parsed.data.active,
      },
      create: {
        matchId: params.matchId,
        prizeId: parsed.data.prizeId,
        assignmentMode: parsed.data.assignmentMode as Mundial2026PrizeAssignmentMode,
        maxWinners: parsed.data.maxWinners ?? null,
        sortOrder: parsed.data.sortOrder,
        active: parsed.data.active,
      },
    });

    return apiOk({ matchPrize }, 201);
  } catch (error) {
    console.error("Error assigning Mundial 2026 prize to match:", error);
    return apiError("ASSIGN_FAILED", "No se pudo asignar el premio al partido.", { matchId: params.matchId }, 500);
  }
}