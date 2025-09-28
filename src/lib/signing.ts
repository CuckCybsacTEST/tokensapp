import { createHmac } from "crypto";
// Use require to avoid TS type mismatch issues with Buffer vs ArrayBufferView in some ambient typings.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { timingSafeEqual } = require('crypto') as { timingSafeEqual: (a: Buffer, b: Buffer) => boolean };

// Current active signature version (bump when rotating secrets for new tokens)
export const CURRENT_SIGNATURE_VERSION = Number(process.env.CURRENT_SIGNATURE_VERSION || 1);

// Map multi-version secrets. Supports variables in either form:
//   TOKEN_SECRET_V1, TOKEN_SECRET_V2 ... (preferred) OR TOKEN_SECRET_1, TOKEN_SECRET_2
// Falls back to legacy TOKEN_SECRET if no versioned var is present for CURRENT_SIGNATURE_VERSION.
// In production you should always provide versioned env vars to enable safe rotation.
const buildSecretMap = (): Record<number, string> => {
  const map: Record<number, string> = {};
  for (let v = 1; v <= 8; v++) { // support up to 8 historical versions without code change
    const val = process.env[`TOKEN_SECRET_V${v}`] || process.env[`TOKEN_SECRET_${v}`];
    if (val && val.trim()) map[v] = val.trim();
  }
  // Backward compatibility: if no explicit V1 provided but legacy TOKEN_SECRET exists, bind it to version 1
  if (!map[1] && process.env.TOKEN_SECRET) {
    map[1] = process.env.TOKEN_SECRET;
  }
  return map;
};

export const SECRET_MAP: Record<number, string> = buildSecretMap();

function getSecretForVersion(version: number): string | null {
  return SECRET_MAP[version] || null;
}

// Fail fast (once) if current version secret is missing. We purposely do this at import time to avoid
// issuing tokens with an undefined secret (security hardening). In test/dev fallback to 'dev_secret'.
if (process.env.NODE_ENV !== 'test') {
  const curSecret = getSecretForVersion(CURRENT_SIGNATURE_VERSION) || (process.env.NODE_ENV === 'development' ? 'dev_secret' : null);
  if (!curSecret) {
    // eslint-disable-next-line no-console
    console.error(`[signing] Missing secret for CURRENT_SIGNATURE_VERSION=${CURRENT_SIGNATURE_VERSION}. Define TOKEN_SECRET_V${CURRENT_SIGNATURE_VERSION}.`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing signing secret for active signature version');
    }
  }
}

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
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false; // already checked, defensive
  return timingSafeEqual(a, b);
  } catch {
    let diff = 0; // fallback manual XOR
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  }
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
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(payload.sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, code: "INVALID_SIGNATURE" } as const;
  } catch {
    let diff = 0; // manual fallback
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ payload.sig.charCodeAt(i);
    if (diff !== 0) return { ok: false, code: "INVALID_SIGNATURE" } as const;
  }

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
