import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { invitationTemplate } from './templates';
import { generateQrPngBuffer } from '@/lib/qr-server';

function escapeXml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

/**
 * Generate a composed invitation card image:
 *   template (1080×1920) + QR overlay + guest-name text + event-name text
 */
export async function generateInvitationCard(opts: {
  redeemUrl: string;
  guestName: string;
  eventName: string;
  templateUrl?: string | null;
  format?: 'png' | 'webp';
}): Promise<Buffer> {
  const tpl = invitationTemplate;
  const fmt = opts.format ?? 'png';

  // ── 1. Load template ──────────────────────────────────────────────────
  let templateBuf: Buffer;
  const sourceUrl = opts.templateUrl || tpl.defaultUrl;
  if (sourceUrl) {
    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      templateBuf = Buffer.from(await res.arrayBuffer());
    } catch {
      templateBuf = await _solidBackground(tpl.width, tpl.height);
    }
  } else {
    templateBuf = await _solidBackground(tpl.width, tpl.height);
  }

  // ── 2. QR ─────────────────────────────────────────────────────────────
  const qrSize = tpl.qr.size;     // 460 px
  const qrLeft = tpl.qr.left;     // 310 px from left
  const qrTop  = tpl.qr.top;      // 621 px from top
  const qrPng = await generateQrPngBuffer(opts.redeemUrl, qrSize);

  // rounded corners on QR
  const cornerR = Math.round(qrSize * 0.08);
  const maskSvg = Buffer.from(
    `<svg width="${qrSize}" height="${qrSize}" xmlns="http://www.w3.org/2000/svg"><rect width="${qrSize}" height="${qrSize}" rx="${cornerR}" ry="${cornerR}" fill="white"/></svg>`,
  );
  const roundedQr = await sharp(qrPng).composite([{ input: maskSvg, blend: 'dest-in' }]).png().toBuffer();

  const composites: sharp.OverlayOptions[] = [{ input: roundedQr, top: qrTop, left: qrLeft }];

  // ── 3. Embed font ─────────────────────────────────────────────────────
  let fontCss = '';
  const fontPaths = [
    path.resolve(process.cwd(), 'public', 'fonts', 'StretchPro.woff2'),
    path.resolve(process.cwd(), 'fonts', 'StretchPro.woff2'),
  ];
  for (const fp of fontPaths) {
    try {
      const buf = await fs.readFile(fp);
      fontCss = `@font-face{font-family:'SP';src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2');}`;
      break;
    } catch {
      /* try next */
    }
  }

  // ── 4. Name bar (guest name) ──────────────────────────────────────────
  const nbW    = tpl.nameBar.width;    // 438 px
  const nbH    = tpl.nameBar.height;   // 74 px
  const nbLeft = tpl.nameBar.left;     // 321 px from left
  const nbTop  = tpl.nameBar.top;      // 1127 px from top

  const nameUpper = opts.guestName.trim().split(/\s+/).slice(0, 3).join(' ').toUpperCase();
  const nameFont = Math.min(Math.round(nbH * 0.7), Math.round(nbW / (nameUpper.length * 0.58)));

  const nameSvg = Buffer.from(
    `<svg width="${nbW}" height="${nbH}" xmlns="http://www.w3.org/2000/svg">${fontCss ? `<style>${fontCss}</style>` : ''}<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="'SP','Stretch Pro','Arial',sans-serif" font-weight="600" font-size="${nameFont}px" fill="white">${escapeXml(nameUpper)}</text></svg>`,
  );
  const nameRaster = await sharp(nameSvg, { density: 220 }).resize(nbW, nbH).png().toBuffer();
  composites.push({ input: nameRaster, left: nbLeft, top: nbTop });

  // ── 5. Event bar (event name) ─────────────────────────────────────────
  const ebW    = tpl.eventBar.width;   // 438 px
  const ebH    = tpl.eventBar.height;  // 74 px
  const ebLeft = tpl.eventBar.left;    // 321 px from left
  const ebTop  = tpl.eventBar.top;     // 1247 px from top

  const evtUpper = opts.eventName.trim().toUpperCase();
  const evtFont = Math.min(Math.round(ebH * 0.55), Math.round(ebW / (evtUpper.length * 0.52)));

  const evtSvg = Buffer.from(
    `<svg width="${ebW}" height="${ebH}" xmlns="http://www.w3.org/2000/svg">${fontCss ? `<style>${fontCss}</style>` : ''}<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="'SP','Stretch Pro','Arial',sans-serif" font-weight="500" font-size="${evtFont}px" fill="#c8c8c8" letter-spacing="1">${escapeXml(evtUpper)}</text></svg>`,
  );
  const evtRaster = await sharp(evtSvg, { density: 220 }).resize(ebW, ebH).png().toBuffer();
  composites.push({ input: evtRaster, left: ebLeft, top: ebTop });

  // ── 6. Compose ────────────────────────────────────────────────────────
  let base = sharp(templateBuf);
  const meta = await base.metadata();
  if (meta.width !== tpl.width || meta.height !== tpl.height) {
    base = base.resize(tpl.width, tpl.height, { fit: 'cover' });
  }

  const result = base.composite(composites);
  return fmt === 'png' ? result.png({ compressionLevel: 9 }).toBuffer() : result.webp({ quality: 92 }).toBuffer();
}

async function _solidBackground(w: number, h: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 4, background: { r: 12, g: 12, b: 12, alpha: 1 } },
  })
    .png()
    .toBuffer();
}
