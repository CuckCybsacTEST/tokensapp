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
  // Solo devolver premios que tienen tokens en lotes NO reutilizables (ruleta)
  const roulettePrizeIds = await prisma.token.findMany({
    where: { batch: { isReusable: false } },
    select: { prizeId: true },
    distinct: ['prizeId']
  });
  const validPrizeIds = roulettePrizeIds.map(t => t.prizeId);

  const prizes = await prisma.prize.findMany({
    where: { id: { in: validPrizeIds } },
    orderBy: { createdAt: "asc" }
  });
  return apiOk(prizes, 200);
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = prizeSchema.safeParse(json);
  if (!parsed.success) {
    return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
  }
  // Compute a robust unique key: find the smallest available "premioN"
  async function computeNextKey() {
    const rows = await prisma.prize.findMany({ select: { key: true }, where: { key: { startsWith: 'premio' } } });
    const used = new Set<number>();
    for (const r of rows) {
      const m = /^premio(\d+)$/.exec(String(r.key || ''));
      if (m) used.add(Number(m[1]));
    }
    let i = 1;
    while (used.has(i)) i++;
    return `premio${i}`;
  }
  let key = await computeNextKey();
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
  // Create with retry on unique constraint collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const prize = await prisma.prize.create({ data: { key, ...parsed.data, color } });
      invalidatePrizeCache(prize.id);
      return apiOk(prize, 201);
    } catch (e: any) {
      const code = e?.code || e?.errorCode || e?.meta?.code;
      const target = Array.isArray(e?.meta?.target) ? e.meta.target.join(',') : e?.meta?.target;
      // Prisma P2002 = Unique constraint failed on the {constraint}
      if ((code === 'P2002' || /unique/i.test(String(e?.message))) && String(target || '').includes('key')) {
        // Recompute next key and retry
        key = await computeNextKey();
        continue;
      }
      return apiError('CREATE_FAILED', 'No se pudo crear el premio', { message: String(e?.message || e) }, 500);
    }
  }
  return apiError('CREATE_CONFLICT', 'No se pudo generar una clave única para el premio', {}, 409);
}
