/* Staff PIN generation/validation utilities
 * PIN de 5 dígitos derivado por HMAC-SHA256 sobre slots de tiempo.
 * No persiste en DB. Acepta slot actual y el anterior para tolerar desfasajes.
 */

export type PinWindow = 'hour' | 'day' | number; // number = minutos

function getSecret(): string {
  const s = process.env.STAFF_PIN_SECRET || 'dev_staff_pin_secret';
  return String(s);
}

function now(): Date { return new Date(); }

function formatSlot(d: Date, window: PinWindow): string {
  if (typeof window === 'number') {
    // agrupar por bloques de N minutos desde epoch
    const minutes = Math.max(1, Math.floor(window));
    const slot = Math.floor(d.getTime() / (minutes * 60 * 1000));
    return `m${minutes}:${slot}`;
  }
  if (window === 'day') {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `d:${y}${m}${day}`;
  }
  // hour por defecto
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  return `h:${y}${m}${day}${h}`;
}

async function hmacSha256Base64url(message: string, secret: string): Promise<string> {
  // Web Crypto cuando esté, Node crypto como fallback
  const enc = new TextEncoder();
  const msg = enc.encode(message);
  if ((globalThis as any).crypto?.subtle && typeof (globalThis as any).crypto.subtle.importKey === 'function') {
    const key = await (globalThis as any).crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await (globalThis as any).crypto.subtle.sign('HMAC', key, msg);
    const b64 = Buffer.from(new Uint8Array(sig)).toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } else {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHmac('sha256', secret).update(message).digest('base64url');
  }
}

export async function generatePinForSlot(date: Date, window: PinWindow = 'hour'): Promise<string> {
  const secret = getSecret();
  const slot = formatSlot(date, window);
  const sig = await hmacSha256Base64url(slot, secret);
  // Tomamos 5 dígitos del hash de forma determinista
  // Convertimos los primeros 6 chars base64url a un entero y modulamos
  const head = sig.slice(0, 8);
  let acc = 0;
  for (let i = 0; i < head.length; i++) acc = (acc * 33 + head.charCodeAt(i)) >>> 0;
  const pin = (acc % 100000).toString().padStart(5, '0');
  return pin;
}

export async function isValidPin(code: string, window: PinWindow = 'hour', tolerancePrevious = true): Promise<boolean> {
  const c = (code || '').trim();
  if (!/^\d{5}$/.test(c)) return false;
  const nowDate = now();
  const current = await generatePinForSlot(nowDate, window);
  if (c === current) return true;
  if (tolerancePrevious) {
    // calcular slot anterior
    const prev = new Date(nowDate.getTime());
    if (window === 'day') {
      prev.setUTCDate(prev.getUTCDate() - 1);
    } else if (typeof window === 'number') {
      prev.setTime(prev.getTime() - window * 60 * 1000);
    } else {
      prev.setUTCHours(prev.getUTCHours() - 1);
    }
    const prevCode = await generatePinForSlot(prev, window);
    if (c === prevCode) return true;
  }
  return false;
}

export function pinWindowFromEnv(): PinWindow {
  const w = (process.env.DELIVER_PIN_WINDOW || '60').trim();
  if (w === 'hour') return 'hour';
  if (w === 'day') return 'day';
  const n = Number(w);
  if (!isNaN(n) && n > 0) return n;
  return 60; // 60 minutos por defecto
}
