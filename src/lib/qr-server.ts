// Server-only QR helpers (Node.js runtime). Avoid importing this file in Client Components.
// We defensively resolve the correct export shape because depending on the bundler/ESM interop
// `import QRCode from 'qrcode'` may yield an object without the functions (they are named exports).
// The official lib exposes `toBuffer`, `toDataURL`, etc. as top-level exports.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dynamic resolution of module shape
import * as QRAll from 'qrcode';

type QrLib = { toBuffer?: (text: string, opts: any) => Promise<Buffer> | Buffer } & Record<string, any>;

function resolveQrLib(): QrLib {
  const cand: any[] = [QRAll, (QRAll as any).default].filter(Boolean);
  for (const c of cand) {
    if (c && typeof c.toBuffer === 'function') return c;
  }
  return { } as QrLib;
}

const qrLib = resolveQrLib();

export async function generateQrPngBuffer(text: string, size: number): Promise<Buffer> {
  if (!qrLib.toBuffer) {
    const msg = '[inviteCard][qr] QR library toBuffer no disponible (posible problema de import)';
    if (!process.env.SILENCE_INVITE_CARD_LOGS) {
      // eslint-disable-next-line no-console
      console.error(msg, { exportedKeys: Object.keys(QRAll || {}) });
    }
    throw new Error(msg);
  }
  try {
    const out = await qrLib.toBuffer(text, { errorCorrectionLevel: 'M', margin: 1, width: size });
    // Some versions might (rarely) return non-Promise Buffer synchronously.
    return out as Buffer;
  } catch (e: any) {
    if (!process.env.SILENCE_INVITE_CARD_LOGS) {
      // eslint-disable-next-line no-console
      console.error('[inviteCard][qr] Error generando QR', { err: e?.message, stack: e?.stack });
    }
    throw e;
  }
}
