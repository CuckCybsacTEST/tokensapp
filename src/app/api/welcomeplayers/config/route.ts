import { apiOk } from "@/lib/apiError";
import { WELCOME_PLAYERS_DEFAULT_CONFIG } from "@/lib/welcomeplayers/config";
import { getActiveWelcomePlayersPrizes } from "@/lib/welcomeplayers/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const prizes = await getActiveWelcomePlayersPrizes();
  return apiOk({
    title: WELCOME_PLAYERS_DEFAULT_CONFIG.title,
    subtitle: WELCOME_PLAYERS_DEFAULT_CONFIG.subtitle,
    instructions: WELCOME_PLAYERS_DEFAULT_CONFIG.instructions,
    aspectRatio: WELCOME_PLAYERS_DEFAULT_CONFIG.aspectRatio,
    prizes: prizes.length ? prizes : WELCOME_PLAYERS_DEFAULT_CONFIG.prizes,
    generatedAt: new Date().toISOString(),
  });
}
