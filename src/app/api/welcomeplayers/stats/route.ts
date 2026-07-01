import { NextRequest } from "next/server";
import { apiOk } from "@/lib/apiError";
import { listWelcomePlayersPrizes } from "@/lib/welcomeplayers/repository";
import { getWelcomePlayersState } from "@/lib/welcomeplayers/store";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const prizes = await listWelcomePlayersPrizes();
  const stats = await getWelcomePlayersState(prizes);
  return apiOk({
    ...stats,
    generatedAt: new Date().toISOString(),
  });
}
