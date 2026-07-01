import { prisma } from "@/lib/prisma";
import { WELCOME_PLAYERS_SEED_PRIZES } from "./config";

type PrizeStatus = "active" | "inactive";

const WELCOME_PLAYERS_COLOR_PALETTE = [
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#A855F7",
  "#6366F1",
  "#3B82F6",
  "#14B8A6",
  "#22C55E",
  "#84CC16",
];

export interface WelcomePlayersPrizeRecord {
  id: string;
  label: string;
  description: string | null;
  color: string;
  status: PrizeStatus;
  weight: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

function normalizeColor(color?: string | null) {
  const fallback = "#F59E0B";
  if (typeof color !== "string") return fallback;
  const trimmed = color.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 32);
}

function normalizeStatus(status?: string | null): PrizeStatus {
  return status === "inactive" ? "inactive" : "active";
}

function getAutomaticOrder(prizes: Array<{ order: number }>) {
  const maxOrder = prizes.reduce((max, prize) => Math.max(max, Math.floor(prize.order ?? 0)), -1);
  return maxOrder + 1;
}

function pickRandomWheelColor(prizes: Array<{ color: string }>) {
  const orderedColors = prizes.map((prize) => normalizeColor(prize.color)).filter(Boolean);
  const firstColor = orderedColors[0];
  const lastColor = orderedColors[orderedColors.length - 1];
  const blocked = new Set([firstColor, lastColor].filter((color): color is string => Boolean(color)));
  const candidates = WELCOME_PLAYERS_COLOR_PALETTE.filter((color) => !blocked.has(color));
  const palette = candidates.length ? candidates : WELCOME_PLAYERS_COLOR_PALETTE;
  return palette[Math.floor(Math.random() * palette.length)];
}

function buildSeedPrizeRecords() {
  let current: Array<{ order: number; color: string }> = [];

  return WELCOME_PLAYERS_SEED_PRIZES.map((prize) => {
    const color = pickRandomWheelColor(current);
    const order = getAutomaticOrder(current);
    const record = {
      id: prize.id,
      label: prize.label,
      description: prize.description || null,
      color,
      status: prize.status,
      weight: prize.weight,
      order,
    };

    current = [...current, { order, color }];
    return record;
  });
}

export async function ensureWelcomePlayersSeed() {
  const existingCount = await (prisma as any).welcomePlayersPrize.count();
  if (existingCount > 0) return false;
  await (prisma as any).welcomePlayersPrize.createMany({
    data: buildSeedPrizeRecords(),
  });
  return true;
}

export async function listWelcomePlayersPrizes() {
  await ensureWelcomePlayersSeed();
  return (await (prisma as any).welcomePlayersPrize.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })) as WelcomePlayersPrizeRecord[];
}

export async function getActiveWelcomePlayersPrizes() {
  const prizes = await listWelcomePlayersPrizes();
  return prizes.filter((prize) => prize.status === "active");
}

export async function createWelcomePlayersPrize(input: {
  label: string;
  description?: string | null;
  weight?: number;
  status?: string | null;
}) {
  const existingPrizes = (await (prisma as any).welcomePlayersPrize.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })) as WelcomePlayersPrizeRecord[];

  return (await (prisma as any).welcomePlayersPrize.create({
    data: {
      id: crypto.randomUUID(),
      label: input.label.trim(),
      description: input.description?.trim() || null,
      color: pickRandomWheelColor(existingPrizes),
      weight: Math.max(1, Math.floor(input.weight ?? 1)),
      order: getAutomaticOrder(existingPrizes),
      status: normalizeStatus(input.status),
    },
  })) as WelcomePlayersPrizeRecord;
}

export async function updateWelcomePlayersPrize(
  id: string,
  input: {
    label?: string;
    description?: string | null;
    weight?: number;
    status?: string | null;
  }
) {
  return (await (prisma as any).welcomePlayersPrize.update({
    where: { id },
    data: {
      ...(input.label != null ? { label: input.label.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.weight != null ? { weight: Math.max(1, Math.floor(input.weight)) } : {}),
      ...(input.status != null ? { status: normalizeStatus(input.status) } : {}),
    },
  })) as WelcomePlayersPrizeRecord;
}

export async function deleteWelcomePlayersPrize(id: string) {
  await (prisma as any).welcomePlayersPrize.delete({ where: { id } });
}
