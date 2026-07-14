import { Mundial2026PrizeAssignmentMode } from "@prisma/client";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { reassignMundial2026MatchPrizes } from "@/lib/mundial2026/operations";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const updateMatchPrizeSchema = z.object({
  assignmentMode: z.enum(["DIRECT_FIRST_N", "RAFFLE", "RAFFLE_POOL", "FALLBACK"]),
  maxWinners: z.coerce.number().int().min(1).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0),
  active: z.coerce.boolean().default(true),
});

export async function PATCH(req: Request, { params }: { params: { matchId: string; matchPrizeId: string } }) {
  try {
    const json = await req.json();
    const parsed = updateMatchPrizeSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos para la asignación.", parsed.error.flatten(), 400);
    }
    const normalizedAssignmentMode = parsed.data.assignmentMode === "DIRECT_FIRST_N" ? "DIRECT_FIRST_N" : "RAFFLE_POOL";
    const existing = await prisma.mundial2026MatchPrize.findFirst({
      where: {
        id: params.matchPrizeId,
        matchId: params.matchId,
      },
      select: {
        id: true,
        prizeId: true,
        match: { select: { status: true } },
        prize: { select: { stockReserved: true, stockClaimed: true } },
      },
    });

    if (!existing) {
      return apiError("NOT_FOUND", "Asignación no encontrada.", { matchPrizeId: params.matchPrizeId }, 404);
    }

    const targetStockTotal = parsed.data.maxWinners == null
      ? null
      : Math.max(parsed.data.maxWinners, existing.prize.stockReserved + existing.prize.stockClaimed);

    await prisma.$transaction(async (tx) => {
      await tx.mundial2026MatchPrize.update({
        where: { id: existing.id },
        data: {
          assignmentMode: normalizedAssignmentMode as Mundial2026PrizeAssignmentMode,
          maxWinners: parsed.data.maxWinners ?? null,
          sortOrder: parsed.data.sortOrder,
          active: parsed.data.active,
        },
      });

      if (targetStockTotal != null) {
        await tx.mundial2026Prize.update({
          where: { id: existing.prizeId },
          data: { stockTotal: targetStockTotal },
        });
      }
    });

    const reassignment = existing.match.status === "SETTLED"
      ? await reassignMundial2026MatchPrizes({ matchId: params.matchId })
      : null;

    return apiOk({ updated: true, reassignment });
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
