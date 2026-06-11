import { Mundial2026MatchResult } from "@prisma/client";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { settleMundial2026Match } from "@/lib/mundial2026/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  result: z.enum(["HOME", "DRAW", "AWAY", "VOID"]),
});

export async function POST(req: Request, { params }: { params: { matchId: string } }) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError("INVALID_BODY", "Resultado inválido", parsed.error.flatten(), 400);
    }

    const settlement = await settleMundial2026Match({
      matchId: params.matchId,
      result: parsed.data.result as Mundial2026MatchResult,
    });

    return apiOk({ settlement });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo liquidar el partido.";
    const status = message.includes("no encontrado") ? 404 : message.includes("ya fue liquidado") ? 409 : 400;
    return apiError("SETTLEMENT_FAILED", message, { matchId: params.matchId }, status);
  }
}