import { DateTime } from "luxon";

export const MUNDIAL2026_FANZONE_LABEL = "Copa Pisco Sour — GRATIS";
export const MUNDIAL2026_FANZONE_THEME = "summer";
export const MUNDIAL2026_FANZONE_EXPIRES_ON = "2026-08-02";
const DEFAULT_TIMEZONE = "America/Lima";

export function normalizeMundial2026FanZoneVerifiedName(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .toLowerCase();
}

export function formatMundial2026FanZoneExpiresAt(
  date = DateTime.fromISO(`${MUNDIAL2026_FANZONE_EXPIRES_ON}T23:59:59.999`, { zone: DEFAULT_TIMEZONE }).toJSDate()
) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}
