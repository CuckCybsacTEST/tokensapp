import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { normalizeHexColor } from "@/lib/color";
import { prisma } from "@/lib/prisma";
import { invalidatePrizeCache } from "@/lib/prizeCache";

const prizeSchema = z.object({
  label: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
  stock: z.number().int().nonnegative().optional(),
});

export async function GET() {
  const prizes = await prisma.prize.findMany({ orderBy: { createdAt: "asc" } });
  return apiOk(prizes, 200);
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = prizeSchema.safeParse(json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Datos inválidos", parsed.error.flatten(), 400);
  }
  const count = await prisma.prize.count();
  const key = `premio${count + 1}`;
  let color = parsed.data.color;
  if (color != null) {
    if (color === "")
      color = undefined as any; // vacío => ignorar
    else {
      const norm = normalizeHexColor(color);
      if (!norm) return apiError("INVALID_COLOR", "Color inválido (usa #RRGGBB)", { color }, 400);
      color = norm;
    }
  }
  const prize = await prisma.prize.create({ data: { key, ...parsed.data, color } });
  invalidatePrizeCache(prize.id);
  return apiOk(prize, 201);
}
