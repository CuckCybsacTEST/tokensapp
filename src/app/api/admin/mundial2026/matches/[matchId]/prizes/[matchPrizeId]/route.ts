import { Mundial2026PrizeAssignmentMode } from "@prisma/client";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const updateMatchPrizeSchema = z.object({
  assignmentMode: z.enum(["DIRECT_FIRST_N", "RAFFLE"]),
  maxWinners: z.coerce.number().int().min(1).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: z.coerce.boolean().default(true),
});

export async function PATCH(req: Request, { params }: { params: { matchId: string; matchPrizeId: string } }) {
  try {
    const json = await req.json();
    const parsed = updateMatchPrizeSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos para la asignación.", parsed.error.flatten(), 400);
    }

    const matchPrize = await prisma.mundial2026MatchPrize.updateMany({
      where: {
        id: params.matchPrizeId,
        matchId: params.matchId,
      },
      data: {
        assignmentMode: parsed.data.assignmentMode as Mundial2026PrizeAssignmentMode,
        maxWinners: parsed.data.maxWinners ?? null,
        sortOrder: parsed.data.sortOrder,
        active: parsed.data.active,
      },
    });

    if (matchPrize.count === 0) {
      return apiError("NOT_FOUND", "Asignación no encontrada.", { matchPrizeId: params.matchPrizeId }, 404);
    }

    return apiOk({ updated: true });
  } catch (error) {
    console.error("Error updating Mundial 2026 match prize:", error);
    return apiError("UPDATE_FAILED", "No se pudo actualizar la asignación del premio.", { matchPrizeId: params.matchPrizeId }, 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { matchId: string; matchPrizeId: string } }) {
  try {
    const deleted = await prisma.mundial2026MatchPrize.deleteMany({
      where: {
        id: params.matchPrizeId,
        matchId: params.matchId,
      },
    });

    if (deleted.count === 0) {
      return apiError("NOT_FOUND", "Asignación no encontrada.", { matchPrizeId: params.matchPrizeId }, 404);
    }

    return apiOk({ deleted: true });
  } catch (error) {
    console.error("Error deleting Mundial 2026 match prize:", error);
    return apiError("DELETE_FAILED", "No se pudo eliminar la asignación del premio.", { matchPrizeId: params.matchPrizeId }, 500);
  }
}