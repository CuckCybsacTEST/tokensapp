import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/apiError";
import { buildSpinResult } from "@/lib/welcomeplayers/engine";
import { recordWelcomePlayersSpin } from "@/lib/welcomeplayers/store";
import { logEvent } from "@/lib/log";
import { getActiveWelcomePlayersPrizes } from "@/lib/welcomeplayers/repository";

export async function POST(_req: NextRequest) {
  try {
    const prizes = await getActiveWelcomePlayersPrizes();
    if (prizes.length < 3) {
      return apiError(
        "NOT_ENOUGH_PRIZES",
        "Necesitamos al menos 3 premios activos para activar la ruleta",
        { minimumRequired: 3, activePrizes: prizes.length },
        409
      );
    }
    const result = buildSpinResult(prizes);
    await recordWelcomePlayersSpin(result);

    await logEvent("WELCOMEPLAYERS_SPIN", "WelcomePlayers spin", {
      spinId: result.spinId,
      prizeId: result.prize.id,
      label: result.prize.label,
      prizeIndex: result.prizeIndex,
      turns: result.turns,
    }).catch(() => {});

    return apiOk({
      spinId: result.spinId,
      prize: result.prize,
      prizeIndex: result.prizeIndex,
      turns: result.turns,
      rotation: result.rotation,
      createdAt: result.createdAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SPIN_FAILED";
    return apiError("SPIN_FAILED", "No se pudo resolver el giro", { reason: message }, 500);
  }
}
