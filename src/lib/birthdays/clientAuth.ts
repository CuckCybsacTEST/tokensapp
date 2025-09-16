import { createHmac, timingSafeEqual } from 'crypto';

type VerifyOk = { ok: true; rid: string };
type VerifyErr = { ok: false; code: 'INVALID' | 'EXPIRED' };

const SECRET = process.env.TOKEN_SECRET || 'dev_secret';
// Seguridad: en producción exige configurar TOKEN_SECRET; si falta, se advierte.
if ((!process.env.TOKEN_SECRET || process.env.TOKEN_SECRET.trim() === '') && process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line no-console
  console.warn('[clientAuth] TOKEN_SECRET no está definido en producción. Define una clave segura para firmar clientSecret.');
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4 || 4);
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return Buffer.from(base64, 'base64');
}

function hmac(input: string): string {
  const sig = createHmac('sha256', SECRET).update(input).digest();
  return b64urlEncode(sig);
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    // Use Uint8Array views to satisfy types for timingSafeEqual
    const av = new Uint8Array(ab.buffer, ab.byteOffset, ab.byteLength);
    const bv = new Uint8Array(bb.buffer, bb.byteOffset, bb.byteLength);
    return timingSafeEqual(av, bv);
  } catch {
    return false;
  }
}

export function signClientSecret(reservationId: string, ttlMinutes = 15): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = { rid: reservationId, iat: nowSec, exp: nowSec + ttlMinutes * 60 };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(Buffer.from(payloadStr, 'utf8'));
  const sig = hmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyClientSecret(token: string): VerifyOk | VerifyErr {
  if (!token || typeof token !== 'string' || !token.includes('.')) return { ok: false, code: 'INVALID' };
  const [payloadB64, sig] = token.split('.', 2);
  const expected = hmac(payloadB64);
  if (!safeEq(expected, sig)) return { ok: false, code: 'INVALID' };
  try {
    const payloadJson = b64urlDecode(payloadB64).toString('utf8');
    const payload = JSON.parse(payloadJson) as { rid: string; iat: number; exp: number };
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload || !payload.rid || !payload.exp || nowSec > payload.exp) return { ok: false, code: 'EXPIRED' };
    return { ok: true, rid: payload.rid };
  } catch {
    return { ok: false, code: 'INVALID' };
  }
}
