/** Shared Roulette types used by API routes and UI components */

export type RouletteStatus = "ACTIVE" | "FINISHED" | "CANCELLED";
export type RouletteMode = "BY_PRIZE" | "BY_TOKEN";

export interface RouletteSnapshotPrize {
  prizeId: string;
  label: string;
  color: string | null;
  count: number; // initial count at snapshot time
}

export interface RouletteSnapshotToken {
  tokenId: string;
  prizeId: string;
  label: string;
  color: string | null;
}

export type RouletteSnapshotMeta =
  | { mode: 'BY_PRIZE'; prizes: RouletteSnapshotPrize[]; createdAt: string }
  | { mode: 'BY_TOKEN'; tokens: RouletteSnapshotToken[]; createdAt: string }
  | (Record<string, any> & { mode: string }); // tolerate legacy/unknown

export interface RouletteSpinDTO {
  id: string;
  prizeId: string;
  order: number; // 1-based sequential order within session
  weightSnapshot: number; // weight used at the moment of spin (remaining before decrement)
  createdAt: string; // ISO
}

export interface RouletteRemainingPrizeDTO {
  prizeId: string;
  label: string;
  color: string | null;
  remaining: number;
}

export interface RouletteSessionDTO {
  sessionId: string;
  batchId: string;
  mode: RouletteMode | string;
  status: RouletteStatus;
  spins: RouletteSpinDTO[];
  snapshot: RouletteSnapshotMeta;
  remaining: RouletteRemainingPrizeDTO[]; // prizes still with remaining tokens
  finished: boolean; // derived convenience flag
  maxSpins: number | null; // total tokens at snapshot (null if unknown)
  createdAt: string; // ISO
  finishedAt: string | null; // ISO or null
}

export interface RouletteSpinResultDTO {
  chosen: { prizeId: string; label: string; color: string | null };
  order: number;
  finished: boolean; // whether this spin completed the session
  remaining: { prizeId: string; count: number; label: string; color: string | null }[]; // remaining counts after spin
}

export interface RouletteCreateSessionResponse {
  sessionId: string;
  elements: any[]; // prizes array (BY_PRIZE) o tokens array (BY_TOKEN)
  mode: RouletteMode | string;
  maxSpins: number;
}

export interface RouletteErrorResponse {
  error: string;
  [k: string]: any; // allow extra diagnostic fields like retryAfterSeconds, sessionId, prizes, etc.
}
