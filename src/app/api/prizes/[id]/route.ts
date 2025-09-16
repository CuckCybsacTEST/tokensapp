import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { normalizeHexColor } from "@/lib/color";
import { prisma } from "@/lib/prisma";
import { invalidatePrizeCache } from "@/lib/prizeCache";

const updateSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  color: z.string().max(32).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  stock: z.number().int().nonnegative().optional().nullable(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Datos inválidos", parsed.error.flatten(), 400);
  }
  try {
    const data = { ...parsed.data } as any;
    if ("color" in data) {
      if (data.color === null) {
        // explicit null => limpiar color
        data.color = null;
      } else if (typeof data.color === "string") {
        if (data.color === "")
          data.color = null; // vacío => null
        else {
          const norm = normalizeHexColor(data.color);
          if (!norm)
            return apiError(
              "INVALID_COLOR",
              "Color inválido (usa #RRGGBB)",
              { color: data.color },
              400
            );
          data.color = norm;
        }
      }
    }
    const updated = await prisma.prize.update({ where: { id: params.id }, data });
    invalidatePrizeCache(params.id);
    return apiOk(updated, 200);
  } catch (e: any) {
    return apiError("NOT_FOUND", "Premio no encontrado", { id: params.id }, 404);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  // Antes de eliminar, asegurarnos que no hay tokens que referencien este premio
  // Tanto por prizeId (asignado al crear) como por assignedPrizeId (asignación posterior)
  const [byPrizeCount, byAssignedCount] = await Promise.all([
    prisma.token.count({ where: { prizeId: id } }),
    prisma.token.count({ where: { assignedPrizeId: id } }),
  ]);

  if (byPrizeCount > 0 || byAssignedCount > 0) {
    return apiError(
      "PRIZE_IN_USE",
      "No se puede eliminar: existen tokens asociados a este premio",
      { prizeId: id, tokensByPrize: byPrizeCount, tokensByAssigned: byAssignedCount },
      409
    );
  }

  try {
    const deleted = await prisma.prize.delete({ where: { id } });
    invalidatePrizeCache(id);
    return apiOk(deleted, 200);
  } catch (e: any) {
    return apiError("NOT_FOUND", "Premio no encontrado", { id }, 404);
  }
}
