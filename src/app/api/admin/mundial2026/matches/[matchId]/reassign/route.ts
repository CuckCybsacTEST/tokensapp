import { apiError, apiOk } from "@/lib/apiError";
import { reassignMundial2026MatchPrizes } from "@/lib/mundial2026/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(_req: Request, { params }: { params: { matchId: string } }) {
  try {
    const reassignment = await reassignMundial2026MatchPrizes({ matchId: params.matchId });
    return apiOk({ reassignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron reasignar los premios del partido.";
    const status = message.includes("no encontrado") ? 404 : 400;
    return apiError("REASSIGNMENT_FAILED", message, { matchId: params.matchId }, status);
  }
}