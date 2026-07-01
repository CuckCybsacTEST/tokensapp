import { WelcomePlayerPrize } from "./types";

export interface WelcomePlayersSpinResult {
  spinId: string;
  prize: WelcomePlayerPrize;
  prizeIndex: number;
  turns: number;
  rotation: number;
  createdAt: string;
}

const WHEEL_START_ANGLE = -90;
// In this wheel's visual coordinate system, the pointer sits at the top.
// The SVG/CSS render uses clockwise-positive rotation, so the pointer angle
// must be expressed as 0° in the same local geometry used to place segments.
const POINTER_ANGLE = 0;

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

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function isAlignedToPointer(winnerCenterAngle: number, rotation: number) {
  return normalizeAngle(winnerCenterAngle + rotation) === normalizeAngle(POINTER_ANGLE);
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
  const winnerCenterAngle = WHEEL_START_ANGLE + prizeIndex * segmentAngle + segmentAngle / 2;
  const alignmentOffset = normalizeAngle(POINTER_ANGLE - winnerCenterAngle);
  const rotation = turns * 360 + alignmentOffset;

  if (!isAlignedToPointer(winnerCenterAngle, alignmentOffset)) {
    throw new Error("SPIN_ALIGNMENT_MISMATCH");
  }

  return {
    spinId: crypto.randomUUID(),
    prize,
    prizeIndex,
    turns,
    rotation,
    createdAt: new Date().toISOString(),
  };
}
