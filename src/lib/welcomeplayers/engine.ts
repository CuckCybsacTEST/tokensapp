import { WelcomePlayerPrize } from "./types";

export interface WelcomePlayersSpinResult {
  spinId: string;
  prize: WelcomePlayerPrize;
  prizeIndex: number;
  turns: number;
  rotation: number;
  createdAt: string;
}

export function pickWelcomePlayerPrize(prizes: WelcomePlayerPrize[]) {
  const active = prizes.filter((prize) => prize.status === "active");
  if (!active.length) {
    throw new Error("NO_ACTIVE_PRIZES");
  }

  const weighted = active.map((prize) => ({
    prize,
    weight: Number.isFinite(prize.weight) && prize.weight > 0 ? prize.weight : 1,
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.prize;
  }

  return weighted[weighted.length - 1].prize;
}

export function buildSpinResult(prizes: WelcomePlayerPrize[]): WelcomePlayersSpinResult {
  const active = prizes.filter((prize) => prize.status === "active").sort((a, b) => a.order - b.order);
  if (!active.length) {
    throw new Error("NO_ACTIVE_PRIZES");
  }

  const prize = pickWelcomePlayerPrize(active);
  const prizeIndex = active.findIndex((candidate) => candidate.id === prize.id);
  const turns = 5 + Math.floor(Math.random() * 3);
  const segmentAngle = 360 / active.length;
  const baseOffset = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
  const rotation = turns * 360 + baseOffset;

  return {
    spinId: crypto.randomUUID(),
    prize,
    prizeIndex,
    turns,
    rotation,
    createdAt: new Date().toISOString(),
  };
}

