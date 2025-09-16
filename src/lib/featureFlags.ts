// Simple feature flags centralization.
// twoPhaseRedemption: temporal via env var until DB column is added to SystemConfig.
// Usage (future): if (await isTwoPhaseRedemptionEnabled()) { ... }

/** Returns true if the value indicates an enabled boolean */
function parseBool(val: string | undefined): boolean {
  if (!val) return false;
  const v = val.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Two-phase redemption (reveal->deliver) feature flag.
 * Current source: env var TWO_PHASE_REDEMPTION.
 * Planned future source: SystemConfig.twoPhaseRedemption (DB) with env as override.
 */
export function isTwoPhaseRedemptionEnabled(): boolean {
  return parseBool(process.env.TWO_PHASE_REDEMPTION);
}

/**
 * Birthdays public layer flag.
 * Sources (alias):
 * - BIRTHDAYS_PUBLIC
 * - NEXT_PUBLIC_BIRTHDAYS_ENABLED
 * Defaults: ON (true) cuando no está definido. En desarrollo (NODE_ENV!=='production'), se mantiene ON.
 * Nota: En el cliente, sólo las variables NEXT_PUBLIC_* están disponibles; en rutas de API (server) ambas funcionan.
 */
export function isBirthdaysEnabledPublic(): boolean {
  const vAlias = process.env.BIRTHDAYS_PUBLIC; // server only
  const vNext = process.env.NEXT_PUBLIC_BIRTHDAYS_ENABLED; // client/server
  if (vAlias !== undefined && vAlias !== null && vAlias !== '') return parseBool(vAlias);
  if (vNext !== undefined && vNext !== null && vNext !== '') return parseBool(vNext);
  // Por defecto: habilitado. Requisito: en dev debe estar ON sin configuración adicional.
  return true;
}

/** Admin-side birthdays tools are enabled by default. */
export function isBirthdaysEnabledAdmin(): boolean {
  return true;
}

/**
 * Expose all flags (extend as more flags appear) for diagnostics.
 */
export function getFeatureFlagsSnapshot() {
  return {
    twoPhaseRedemption: isTwoPhaseRedemptionEnabled(),
    birthdaysPublic: isBirthdaysEnabledPublic(),
    birthdaysAdmin: isBirthdaysEnabledAdmin(),
  };
}
