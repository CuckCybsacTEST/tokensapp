import { createHmac } from 'crypto';
import { CURRENT_SIGNATURE_VERSION } from '@/lib/signing';

// Payload shape for special-event invitation claim
export type InvitationClaim = {
  t: 'invitation'; // type discriminator
  eid: string;     // eventId
  iid: string;     // invitationId
  code: string;    // human/short code
  iat: number;     // issued-at (epoch seconds)
  exp: number;     // expiry (epoch seconds)
  v?: number;      // signature version
};

export type SignedInvitationToken = {
  payload: InvitationClaim;
  sig: string; // base64url HMAC
};

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dev_secret';

function b64url(buf: Buffer) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function buildMessage(p: InvitationClaim): string {
  const v = p.v ?? CURRENT_SIGNATURE_VERSION;
  return `${v}|${p.t}|${p.eid}|${p.iid}|${p.code}|${p.iat}|${p.exp}`;
}

export function signInvitationClaim(payload: InvitationClaim): SignedInvitationToken {
  const v = payload.v ?? CURRENT_SIGNATURE_VERSION;
  const msg = buildMessage({ ...payload, v });
  const sig = b64url(createHmac('sha256', TOKEN_SECRET).update(msg).digest());
  return { payload: { ...payload, v }, sig };
}

export function verifyInvitationClaim(
  token: SignedInvitationToken,
  opts?: { now?: Date },
): { ok: true; payload: InvitationClaim } | { ok: false; code: 'INVALID_SIGNATURE' | 'EXPIRED' } {
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

/** Build default payload fields for an invitation */
export function buildDefaultInvitationClaim(
  eventId: string,
  invitationId: string,
  code: string,
  expiresAt: Date,
): InvitationClaim {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = Math.floor(expiresAt.getTime() / 1000);
  return {
    t: 'invitation',
    eid: eventId,
    iid: invitationId,
    code,
    iat: nowSec,
    exp: expSec,
    v: CURRENT_SIGNATURE_VERSION,
  };
}
