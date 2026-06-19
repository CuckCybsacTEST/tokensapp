import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { MUNDIAL2026_CLAIM_WINDOW_HOURS } from "@/lib/mundial2026/time";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const updatePrizeSchema = z.object({
  key: z.string().trim().min(2).max(80),
  label: z.string().trim().min(2).max(120),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  stockTotal: z.coerce.number().int().min(1).nullable().optional(),
  priority: z.coerce.number().int().min(0).max(999),
  active: z.coerce.boolean(),
});

export async function PATCH(req: Request, { params }: { params: { prizeId: string } }) {
  try {
    const json = await req.json();
    const parsed = updatePrizeSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Datos inválidos para actualizar el premio.", parsed.error.flatten(), 400);
    }

    const prize = await prisma.mundial2026Prize.update({
      where: { id: params.prizeId },
      data: {
        key: parsed.data.key,
        label: parsed.data.label,
        description: parsed.data.description || null,
        stockTotal: parsed.data.stockTotal ?? null,
        priority: parsed.data.priority,
        claimWindowHours: MUNDIAL2026_CLAIM_WINDOW_HOURS,
        active: parsed.data.active,
      },
    });

    return apiOk({ prize });
  } catch (error) {
    console.error("Error updating Mundial 2026 prize:", error);
    const message = error instanceof Error ? error.message : "No se pudo actualizar el premio.";
    const status = message.includes("No record") ? 404 : message.includes("Unique constraint") ? 409 : 500;
    return apiError(
      "UPDATE_FAILED",
      status === 404 ? "Premio no encontrado." : status === 409 ? "Ya existe un premio con esa clave." : message,
      { prizeId: params.prizeId },
      status
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: { prizeId: string } }) {
  try {
    const prize = await prisma.mundial2026Prize.findUnique({
      where: { id: params.prizeId },
      include: {
        _count: {
          select: {
            assignedPredictions: true,
          },
        },
      },
    });

    if (!prize) {
      return apiError("NOT_FOUND", "Premio no encontrado.", { prizeId: params.prizeId }, 404);
    }

    if (prize._count.assignedPredictions > 0) {
      return apiError("PRIZE_IN_USE", "El premio ya fue asignado a jugadas y no puede eliminarse.", { prizeId: params.prizeId }, 409);
    }

    await prisma.$transaction([
      prisma.mundial2026MatchPrize.deleteMany({ where: { prizeId: params.prizeId } }),
      prisma.mundial2026Prize.delete({ where: { id: params.prizeId } }),
    ]);

    return apiOk({ deleted: true });
  } catch (error) {
    console.error("Error deleting Mundial 2026 prize:", error);
    return apiError("DELETE_FAILED", "No se pudo eliminar el premio.", { prizeId: params.prizeId }, 500);
  }
}
