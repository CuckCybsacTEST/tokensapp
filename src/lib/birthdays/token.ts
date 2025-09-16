import { createHmac } from 'crypto';
import { CURRENT_SIGNATURE_VERSION } from '@/lib/signing';
import { getBirthdayTokenTtlHours } from '@/lib/config';

// Payload shape for birthday invite claim
export type BirthdayClaim = {
  t: 'birthday'; // type discriminator
  rid: string;   // reservationId
  kind: 'guest'; // currently only 'guest'
  code: string;  // human/short code
  iat: number;   // issued-at (epoch seconds)
  exp: number;   // expiry (epoch seconds)
  v?: number;    // signature version (defaults to CURRENT_SIGNATURE_VERSION)
};

export type SignedBirthdayToken = {
  payload: BirthdayClaim;
  sig: string; // base64url HMAC
};

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dev_secret';

// TTL helper (hours) with default 72
export function getBirthdayTtlHours(): number {
  return getBirthdayTokenTtlHours();
}

function b64url(buf: Buffer) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function buildMessage(p: BirthdayClaim): string {
  const v = p.v ?? CURRENT_SIGNATURE_VERSION;
  return `${v}|${p.t}|${p.rid}|${p.kind}|${p.code}|${p.iat}|${p.exp}`;
}

export function signBirthdayClaim(payload: BirthdayClaim): SignedBirthdayToken {
  const v = payload.v ?? CURRENT_SIGNATURE_VERSION;
  const msg = buildMessage({ ...payload, v });
  const sig = b64url(createHmac('sha256', TOKEN_SECRET).update(msg).digest());
  return { payload: { ...payload, v }, sig };
}

export function verifyBirthdayClaim(token: SignedBirthdayToken, opts?: { now?: Date }): { ok: true; payload: BirthdayClaim } | { ok: false; code: 'INVALID_SIGNATURE' | 'EXPIRED' } {
  const nowSec = Math.floor((opts?.now ?? new Date()).getTime() / 1000);
  if (nowSec > token.payload.exp) return { ok: false, code: 'EXPIRED' } as const;

  const msg = buildMessage(token.payload);
  const expected = b64url(createHmac('sha256', TOKEN_SECRET).update(msg).digest());
  if (expected.length !== token.sig.length) return { ok: false, code: 'INVALID_SIGNATURE' } as const;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.sig.charCodeAt(i);
  if (diff !== 0) return { ok: false, code: 'INVALID_SIGNATURE' } as const;
  return { ok: true, payload: token.payload } as const;
}

// Helper to build default payload fields (iat/exp) for a reservation & code
export function buildDefaultClaim(reservationId: string, code: string): BirthdayClaim {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + getBirthdayTtlHours() * 3600;
  return { t: 'birthday', rid: reservationId, kind: 'guest', code, iat: nowSec, exp: expSec, v: CURRENT_SIGNATURE_VERSION };
}
