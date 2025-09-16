import { createHmac } from "crypto";

// Current active signature version
export const CURRENT_SIGNATURE_VERSION = 1;

function buildMessage(version: number, tokenId: string, prizeId: string, expiresAt: Date): string {
  // version|token|prize|expUnix
  return `${version}|${tokenId}|${prizeId}|${Math.floor(expiresAt.getTime() / 1000)}`;
}

export function signToken(
  secret: string,
  tokenId: string,
  prizeId: string,
  expiresAt: Date,
  version: number = CURRENT_SIGNATURE_VERSION
) {
  const msg = buildMessage(version, tokenId, prizeId, expiresAt);
  return createHmac("sha256", secret).update(msg).digest("base64url");
}

export function verifyTokenSignature(
  secret: string,
  tokenId: string,
  prizeId: string,
  expiresAt: Date,
  signature: string,
  version: number = CURRENT_SIGNATURE_VERSION
) {
  const expected = signToken(secret, tokenId, prizeId, expiresAt, version);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// --- Person QR helpers ------------------------------------------------------

function buildPersonMessage(version: number, personId: string, tsIso: string): string {
  const epochSec = Math.floor(new Date(tsIso).getTime() / 1000);
  return `${version}|${personId}|${epochSec}`;
}

export function signPersonPayload(
  secret: string,
  personId: string,
  tsIso: string,
  version: number = CURRENT_SIGNATURE_VERSION
) {
  const msg = buildPersonMessage(version, personId, tsIso);
  return createHmac("sha256", secret).update(msg).digest("base64url");
}

export type PersonQrPayload = {
  pid: string; // personId
  ts: string;  // ISO timestamp of issuance
  v?: number;  // signature version (defaults to CURRENT_SIGNATURE_VERSION)
  sig: string; // base64url HMAC
};

export function verifyPersonPayload(
  secret: string,
  payload: PersonQrPayload,
  opts?: { maxSkewSec?: number; now?: Date }
): { ok: true } | { ok: false; code: "INVALID_SIGNATURE" | "STALE" | "FUTURE_TS" | "INVALID_TS" } {
  const version = payload.v ?? CURRENT_SIGNATURE_VERSION;
  const msg = buildPersonMessage(version, payload.pid, payload.ts);
  const expected = createHmac("sha256", secret).update(msg).digest("base64url");
  if (expected.length !== payload.sig.length) return { ok: false, code: "INVALID_SIGNATURE" };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ payload.sig.charCodeAt(i);
  if (diff !== 0) return { ok: false, code: "INVALID_SIGNATURE" };

  // Optional time window checks to mitigate replay
  if (opts?.maxSkewSec) {
    const now = Math.floor((opts.now ?? new Date()).getTime() / 1000);
    const ts = Math.floor(new Date(payload.ts).getTime() / 1000);
    if (!isFinite(ts)) return { ok: false, code: "INVALID_TS" } as const;
    if (ts > now + 60) return { ok: false, code: "FUTURE_TS" } as const; // 60s tolerance for clock drift
    if (now - ts > opts.maxSkewSec) return { ok: false, code: "STALE" } as const;
  }
  return { ok: true } as const;
}

/**
 * Person QR payload contract
 * Encoded in the QR (as JSON or base64url string) with fields:
 *   { pid: string, ts: ISOString, v: number, sig: base64url }
 * Signature is HMAC-SHA256 over `${v}|${pid}|${epochSeconds(ts)}` using TOKEN_SECRET.
 */
