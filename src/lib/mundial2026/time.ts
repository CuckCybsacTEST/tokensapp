import { DateTime } from "luxon";

const DEFAULT_TIMEZONE = "America/Lima";
export const MUNDIAL2026_CLAIM_WINDOW_HOURS = 72;
export const MUNDIAL2026_RECOVERY_WINDOW_HOURS = MUNDIAL2026_CLAIM_WINDOW_HOURS;
const SIMULATED_NOW_ENV = "MUNDIAL2026_SIMULATED_NOW";
const SIMULATED_DAY_ENV = "MUNDIAL2026_SIMULATED_DAY";

function readSimulatedNowInput() {
  const simulatedNow = process.env[SIMULATED_NOW_ENV]?.trim();
  if (simulatedNow) return simulatedNow;

  const simulatedDay = process.env[SIMULATED_DAY_ENV]?.trim();
  if (simulatedDay) return `${simulatedDay}T12:00:00`;

  return null;
}

export function getMundial2026NowInLima() {
  const simulatedInput = readSimulatedNowInput();
  if (!simulatedInput) {
    return DateTime.now().setZone(DEFAULT_TIMEZONE);
  }

  const simulated = DateTime.fromISO(simulatedInput, { zone: DEFAULT_TIMEZONE }).setZone(DEFAULT_TIMEZONE);
  return simulated.isValid ? simulated : DateTime.now().setZone(DEFAULT_TIMEZONE);
}

export function getMundial2026NowDate() {
  return getMundial2026NowInLima().toJSDate();
}

export function getMundial2026NowMs() {
  return getMundial2026NowDate().getTime();
}

export function getMundial2026SimulatedNowIso() {
  return getMundial2026NowInLima().toISO() ?? null;
}

export function getMundial2026EffectiveClaimStatus(args: {
  claimStatus: string;
  claimExpiresAt: Date | string | null;
  redeemedAt?: Date | string | null;
  now?: Date;
}) {
  if (args.redeemedAt || args.claimStatus === "REDEEMED") {
    return "REDEEMED";
  }

  if (args.claimStatus !== "AVAILABLE" || !args.claimExpiresAt) {
    return args.claimStatus;
  }

  const now = args.now ?? getMundial2026NowDate();
  const expiresAt = typeof args.claimExpiresAt === "string" ? new Date(args.claimExpiresAt) : args.claimExpiresAt;

  if (Number.isNaN(expiresAt.getTime())) {
    return args.claimStatus;
  }

  return expiresAt.getTime() <= now.getTime() ? "EXPIRED" : args.claimStatus;
}

export function isMundial2026PredictionWindowOpen(args: { status: string; startsAt: Date | string; nowMs?: number }) {
  const startsAtLima =
    typeof args.startsAt === "string"
      ? DateTime.fromISO(args.startsAt).setZone(DEFAULT_TIMEZONE)
      : DateTime.fromJSDate(args.startsAt).setZone(DEFAULT_TIMEZONE);
  const nowLima = DateTime.fromJSDate(new Date(args.nowMs ?? getMundial2026NowMs())).setZone(DEFAULT_TIMEZONE);

  if (["FINISHED", "SETTLED", "CANCELLED", "DRAFT"].includes(args.status)) {
    return false;
  }

  if (!startsAtLima.isValid || !nowLima.isValid) {
    return false;
  }

  return nowLima.startOf("minute").toJSDate().getTime() <= startsAtLima.startOf("minute").toJSDate().getTime();
}
