import { createHmac, randomBytes } from "node:crypto";

import { DateTime } from "luxon";

import { getPublicBaseUrl } from "@/lib/config";

export const MUNDIAL2026_FANZONE_CAMPAIGN_NAME = "mundial2026-fanzone";
export const MUNDIAL2026_FANZONE_LABEL = "Copa Pisco Sour — GRATIS";
export const MUNDIAL2026_FANZONE_THEME = "summer";
export const MUNDIAL2026_FANZONE_EXPIRES_ON = "2026-08-02";
export const MUNDIAL2026_FANZONE_MAX_QR_PER_PARTICIPANT = 2;
const DEFAULT_SECRET = "mundial2026-fanzone-dev-secret";
const DEFAULT_TIMEZONE = "America/Lima";

function getFanZoneSecret() {
  const explicit = process.env.MUNDIAL2026_FANZONE_QR_SECRET?.trim();
  if (explicit) return explicit;

  const campaignSecret = process.env.MUNDIAL2026_QR_SECRET?.trim();
  if (campaignSecret) return campaignSecret;

  const fallback = process.env.TOKEN_SECRET?.trim();
  if (fallback) return fallback;

  return process.env.NODE_ENV === "development" ? DEFAULT_SECRET : DEFAULT_SECRET;
}

export function normalizeMundial2026FanZoneQuery(value: string) {
  return String(value || "").trim();
}

export function calculateMundial2026FanZoneQrCount(totalPredictions: number) {
  if (!Number.isFinite(totalPredictions) || totalPredictions <= 0) {
    return 0;
  }

  // Regla base: 1 QR por cada 2 jugadas, redondeando hacia arriba.
  // Luego aplicamos el tope máximo por participante para evitar emisiones excesivas.
  const baseCount = Math.ceil(totalPredictions / 2);
  return Math.min(baseCount, MUNDIAL2026_FANZONE_MAX_QR_PER_PARTICIPANT);
}

function normalizeNameToken(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "");
}

export function normalizeMundial2026FanZoneVerifiedName(value: string) {
  return normalizeNameToken(value).toLowerCase();
}

const COMMON_FIRST_NAMES = [
  "Angel",
  "Juan",
  "Jose",
  "Luis",
  "Carlos",
  "Miguel",
  "Pedro",
  "Jorge",
  "Diego",
  "Andres",
  "Cesar",
  "Daniel",
  "Mario",
  "Fernando",
  "Ricardo",
  "Alonso",
  "Pablo",
  "Manuel",
  "Raul",
  "Oscar",
  "Julio",
  "Victor",
  "Eduardo",
  "Sergio",
  "Hugo",
  "Nicolas",
  "Erick",
  "Kevin",
  "Bruno",
  "David",
  "Mateo",
  "Samuel",
  "Fabian",
  "Ruben",
  "Christian",
  "Gustavo",
];

const COMMON_LAST_NAMES = [
  "Lopez",
  "Garcia",
  "Ramos",
  "Perez",
  "Torres",
  "Flores",
  "Castro",
  "Ramirez",
  "Mendoza",
  "Vargas",
  "Ruiz",
  "Sanchez",
  "Morales",
  "Quispe",
  "Chavez",
  "Salazar",
  "Paredes",
  "Navarro",
  "Reyes",
  "Cespedes",
  "Cordova",
  "Diaz",
  "Fernandez",
  "Gomez",
  "Rojas",
];

function buildNameSeed(fullName: string) {
  return Array.from(normalizeMundial2026FanZoneVerifiedName(fullName)).reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function pickSeeded(values: string[], seed: number, used: Set<string>) {
  if (values.length === 0) return "";

  const start = seed % values.length;
  for (let offset = 0; offset < values.length; offset += 1) {
    const candidate = values[(start + offset) % values.length];
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }

  return "";
}

function shuffleWithSeed(values: string[], seed: number) {
  const items = [...values];
  let current = seed || 1;
  for (let index = items.length - 1; index > 0; index -= 1) {
    current = (current * 1664525 + 1013904223) >>> 0;
    const swapIndex = current % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function getNonFirstInsertIndex(seed: number, length: number) {
  if (length <= 1) return 0;
  return 1 + (seed % (length - 1));
}

export function buildMundial2026NameVerificationOptions(fullName: string) {
  const tokens = normalizeNameToken(fullName)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return [] as string[];
  }

  const seed = buildNameSeed(fullName);
  const correctName = tokens.join(" ");
  const distractors = new Set<string>();
  const firstToken = tokens[0];
  const lastToken = tokens.at(-1) || "";

  while (distractors.size < 3) {
    const nextSeed = seed + distractors.size * 97 + 13;
    const firstName = pickSeeded(COMMON_FIRST_NAMES, nextSeed, new Set()) || "Angel";
    const lastName = pickSeeded(COMMON_LAST_NAMES, nextSeed * 3 + 7, new Set()) || "Lopez";
    const candidate = normalizeNameToken(`${firstName} ${lastName}`);

    if (
      candidate &&
      normalizeMundial2026FanZoneVerifiedName(candidate) !== normalizeMundial2026FanZoneVerifiedName(correctName) &&
      normalizeMundial2026FanZoneVerifiedName(candidate) !== normalizeMundial2026FanZoneVerifiedName(`${firstToken} ${lastToken}`)
    ) {
      distractors.add(candidate);
    }
  }

  const options = shuffleWithSeed(Array.from(distractors), seed);
  const insertIndex = getNonFirstInsertIndex(seed + 17, options.length + 1);
  options.splice(insertIndex, 0, correctName);
  return options.slice(0, 4);
}

export function getMundial2026FanZoneExpiresAt() {
  return DateTime.fromISO(`${MUNDIAL2026_FANZONE_EXPIRES_ON}T23:59:59.999`, { zone: DEFAULT_TIMEZONE }).toJSDate();
}

export function formatMundial2026FanZoneExpiresAt(date = getMundial2026FanZoneExpiresAt()) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}

export function buildMundial2026FanZoneCode() {
  return `FZ_${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function buildMundial2026FanZonePath(code: string) {
  return `/mundial2026/fanzone/${encodeURIComponent(code)}`;
}

export function buildMundial2026FanZoneUrl(args: { code: string; urlOrReq?: string | URL }) {
  const baseUrl = getPublicBaseUrl(args.urlOrReq);
  return new URL(buildMundial2026FanZonePath(args.code), baseUrl).toString();
}

export function signMundial2026FanZoneQr(payload: {
  code: string;
  customerWhatsapp: string;
  sequence: number;
  totalPredictions: number;
  eligibleQrCount: number;
}) {
  const secret = getFanZoneSecret();
  const message = JSON.stringify({
    code: payload.code,
    customerWhatsapp: payload.customerWhatsapp,
    sequence: payload.sequence,
    totalPredictions: payload.totalPredictions,
    eligibleQrCount: payload.eligibleQrCount,
    version: 1,
  });

  return createHmac("sha256", secret).update(message).digest("base64url");
}
