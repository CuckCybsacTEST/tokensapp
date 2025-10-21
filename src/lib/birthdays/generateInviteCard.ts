import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { inviteTemplates, InviteTemplateKind } from './inviteTemplates';
import { generateQrPngBuffer } from '@/lib/qr-server';

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function escapeXml(s: string) { return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] as string)); }
function formatFecha(iso: string) {
  try {
    let d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    // Ajustar a Lima (UTC-5)
    d = new Date(d.getTime() + 5 * 60 * 60 * 1000);
    const dia = d.getUTCDate().toString().padStart(2,'0');
    const mes = d.toLocaleDateString('es-PE',{ month:'long', timeZone: 'America/Lima' }).toLowerCase();
    return `${dia} ${mes}`;
  } catch { return ''; }
}

export async function generateInviteCard(
  kind: InviteTemplateKind,
  code: string,
  redeemUrl: string,
  format: 'webp' | 'png' = 'webp',
  celebrantName?: string,
  reservationDateISO?: string,
) {
  const tpl = inviteTemplates[kind];
  const absPath = path.join(process.cwd(), tpl.path);
  let templateInput: Buffer | null = null;
  try {
    templateInput = await fs.readFile(absPath);
  } catch (e: any) {
    if (!process.env.SILENCE_INVITE_CARD_LOGS) {
      // eslint-disable-next-line no-console
      console.warn('[inviteCard] no se pudo leer plantilla, usando fondo plano', { path: absPath, error: e?.message });
    }
    templateInput = await sharp({ create: { width: tpl.width, height: tpl.height, channels: 4, background: { r: 12, g: 12, b: 12, alpha: 1 } } })
      .png()
      .toBuffer();
  }

  const qrSize = Math.round(tpl.width * tpl.area.sizeRatio);
  const left = Math.round(tpl.width * tpl.area.leftRatio);
  const top = Math.round(tpl.height * tpl.area.topRatio);

  let qrPng: Buffer;
  try {
    qrPng = await generateQrPngBuffer(redeemUrl, qrSize);
  } catch (e: any) {
    if (!process.env.SILENCE_INVITE_CARD_LOGS) {
      // eslint-disable-next-line no-console
      console.error('[inviteCard] fallo generando QR', { code, redeemUrl, err: e?.message });
    }
  throw e;
  }
  const cornerR = Math.round(qrSize * 0.08);
  const qrMaskSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><svg width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${qrSize}" height="${qrSize}" rx="${cornerR}" ry="${cornerR}" fill="white"/></svg>`);
  const roundedQr = await sharp(qrPng).composite([{ input: qrMaskSvg, blend: 'dest-in' }]).png().toBuffer();

  const composites: sharp.OverlayOptions[] = [ { input: roundedQr, top, left } ];

  // Variables para la fecha (se posicionará después del nameBar)
  let datePillTop = 0;
  let dateSvgRaster: Buffer | null = null;

  if ((kind === 'guest' || kind === 'host') && celebrantName && (tpl as any).nameBar) {
    const nb = (tpl as any).nameBar as { leftRatio: number; widthRatio: number; topRatio: number; heightRatio: number };
  let barWidth = Math.round(tpl.width * nb.widthRatio);
    const baseBarHeight = Math.round(tpl.height * nb.heightRatio);
    let barLeft = Math.round(tpl.width * nb.leftRatio);
    if (barWidth > tpl.width) barWidth = tpl.width;
    if (barLeft < 0) barLeft = 0;
    if (barLeft + barWidth > tpl.width) barLeft = tpl.width - barWidth;
    const baseBarTop = Math.round(tpl.height * nb.topRatio);
    const first = celebrantName.trim().split(/\s+/)[0];
    const firstUpper = first.toUpperCase();
    const fechaTxt = reservationDateISO ? formatFecha(reservationDateISO) : '';
    const maxWidth = barWidth - 40;
    const approxChar = (h: number) => h * 0.58;
    const singleFont = (h: number) => clamp(Math.floor(h * 0.65), 30, 80); // Aumentar tamaño de fuente
    let barHeight = baseBarHeight;
    let phraseLines: string[];
    if (kind === 'host') {
      phraseLines = [firstUpper];
      barHeight = Math.round(baseBarHeight * 1.8); // Aumentar altura para fuente más grande
    } else { // guest
      phraseLines = [firstUpper];
      barHeight = Math.round(baseBarHeight * 1.8); // Aumentar altura para fuente más grande
    }
    let f1 = singleFont(barHeight);
    const longest = phraseLines.reduce((m, l) => Math.max(m, l.length), 0);
    let widthEstimate = longest * approxChar(f1);
    if (widthEstimate > maxWidth) {
      barHeight = Math.round(barHeight * 1.2);
      f1 = clamp(Math.floor(barHeight * 0.55), 25, 70); // Aumentar tamaño de fuente
    } else {
      f1 = clamp(Math.floor(barHeight * 0.60), 25, 75); // Aumentar tamaño de fuente
    }
    const f2 = clamp(Math.floor(barHeight * 0.30), 16, 42);
    const gap = clamp(Math.floor(barHeight * 0.09), 4, 24);
    const effectiveGap = phraseLines.length > 1 ? Math.max(4, Math.floor(gap * 0.8)) : gap;
    const strokeW = clamp(Math.round(barHeight * 0.05), 2, 8);
    const radius = Math.min(Math.round(barHeight * 0.45), 38);
    const bottomY = baseBarTop + baseBarHeight;
  let barTop = baseBarTop; // Usar directamente el topRatio definido en el template
    // Nota: Se elimina la lógica de reposicionamiento automático por margen inferior
    // para respetar el topRatio definido en inviteTemplates.ts
    const inset = strokeW / 2;
    const dateColor = '#c8c8c8';
    const linesHeight = phraseLines.length * f1 + (phraseLines.length - 1) * effectiveGap;
    const blockHeight = linesHeight + effectiveGap + f2;
  // Padding interno configurable
    const bottomPadRatioEnv = process.env.INVITE_CARD_FOOTER_TEXT_BOTTOM_PAD_RATIO;
    const bottomPadPxEnv = process.env.INVITE_CARD_FOOTER_TEXT_BOTTOM_PAD_PX;
    let bottomPadding = Math.round(barHeight * 0.06);
    if (bottomPadRatioEnv) {
      const r = parseFloat(bottomPadRatioEnv);
      if (Number.isFinite(r) && r >= 0 && r <= 0.4) bottomPadding = Math.round(barHeight * r);
    } else if (bottomPadPxEnv) {
      const px = parseInt(bottomPadPxEnv, 10);
      if (Number.isFinite(px) && px >= 0 && px < barHeight - 8) bottomPadding = px;
    }
    const MIN_TOP = 8;
    const MIN_BOTTOM = 6;
    // Clamps
    const maxBottomAllowed = Math.max(MIN_BOTTOM, barHeight - blockHeight - MIN_TOP);
    if (bottomPadding > maxBottomAllowed) bottomPadding = maxBottomAllowed;
    bottomPadding = clamp(bottomPadding, MIN_BOTTOM, barHeight - MIN_TOP - 4);
    let topPadding = barHeight - blockHeight - bottomPadding;
    if (topPadding < MIN_TOP) {
      topPadding = MIN_TOP;
      bottomPadding = Math.max(MIN_BOTTOM, barHeight - blockHeight - topPadding);
    }
    let cursorY = topPadding + Math.round(f1 * 0.90);
    // Debug layout eliminado para limpieza (activar reinsertando bloque si se requiere)
    const highlightColor = 'white'; // Cambiar a blanco para que todo el nombre sea blanco
    let embeddedFontCss = '';
    try {
      const interPath = path.resolve(process.cwd(), 'public', 'fonts', 'StretchPro.woff2');
      const fontBuf = await fs.readFile(interPath);
      embeddedFontCss = `@font-face{font-family:'StretchProEmbed';src:url(data:font/woff2;base64,${fontBuf.toString('base64')}) format('woff2');font-weight:400 700;font-display:swap;}`;
    } catch {}
    let textSvg = embeddedFontCss ? `  <style>${embeddedFontCss}</style>\n` : '';
    for (const line of phraseLines) {
      const idx = line.indexOf(firstUpper);
      if (idx >= 0) {
        const before = line.slice(0, idx);
        const namePart = line.slice(idx, idx + firstUpper.length);
        const after = line.slice(idx + firstUpper.length);
        textSvg += `  <text x="50%" y="${cursorY}" text-anchor="middle" fill="white" font-family="'StretchProEmbed','Stretch Pro','Arial',sans-serif" font-weight="600" font-size="${f1}px">${escapeXml(before)}<tspan fill="${highlightColor}">${escapeXml(namePart)}</tspan>${escapeXml(after)}</text>\n`;
      } else {
        textSvg += `  <text x="50%" y="${cursorY}" text-anchor="middle" fill="white" font-family="'StretchProEmbed','Stretch Pro','Arial',sans-serif" font-weight="600" font-size="${f1}px">${escapeXml(line)}</text>\n`;
      }
      cursorY += f1 + effectiveGap;
    }
  textSvg += `  <text x="50%" y="${cursorY + f2 * 0.85}" text-anchor="middle" fill="${dateColor}" font-family="'InterEmbed','Inter','Arial',sans-serif" font-weight="700" font-size="${f2}px" letter-spacing="1">${escapeXml(fechaTxt)}</text>\n`;
    const nameBarSvg = Buffer.from(`<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg width=\"${barWidth}\" height=\"${barHeight}\" viewBox=\"0 0 ${barWidth} ${barHeight}\" xmlns=\"http://www.w3.org/2000/svg\">\n  <defs>\n    <linearGradient id=\"ograd\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"0%\">\n      <stop offset=\"0%\" stop-color=\"#FF7A00\"/>\n      <stop offset=\"40%\" stop-color=\"#FFA630\"/>\n      <stop offset=\"60%\" stop-color=\"#FFB347\"/>\n      <stop offset=\"100%\" stop-color=\"#FF7A00\"/>\n    </linearGradient>\n  </defs>\n${textSvg}</svg>`);
    let nameBarRaster = await sharp(nameBarSvg, { density: 230 }).resize(barWidth, barHeight).png().toBuffer();
    // Debug size eliminado
    composites.push({ input: nameBarRaster, left: barLeft, top: barTop });

    // Generar fecha debajo del nameBar si hay fecha disponible
    if (reservationDateISO) {
      const fechaSmall = formatFecha(reservationDateISO).toUpperCase();
      const pillFont = Math.max(16, Math.round(qrSize * 0.05)); // Reducir tamaño de fuente para mejor jerarquía
      const horizontalPadding = Math.round(pillFont * 0.8); // Aumentar padding para que quepa el texto
      const textApproxWidth = fechaSmall.length * pillFont * 0.75; // Aumentar multiplicador para ancho completo
      let pillWidth = Math.round(textApproxWidth + horizontalPadding * 2);
      let pillHeight = Math.round(pillFont * 1.5); // Aumentar altura para mejor proporción
      pillWidth = Math.round(pillWidth * 1.08);
      if (pillWidth > tpl.width) pillWidth = tpl.width - 20;
      if (pillHeight > Math.round(tpl.height * 0.2)) pillHeight = Math.round(tpl.height * 0.2);

      // Posicionar la fecha debajo del nameBar
      const marginTop = Math.round(pillFont * 0.8); // Acercar más la fecha al nombre
      let pillTop = barTop + barHeight + marginTop;
      let pillLeft = barLeft + Math.round((barWidth - pillWidth) / 2); // Centrar horizontalmente con el nameBar

      // Asegurar que no se salga de los límites
      if (pillLeft < 0) pillLeft = 0;
      if (pillLeft + pillWidth > tpl.width) pillLeft = tpl.width - pillWidth;
      if (pillTop + pillHeight > tpl.height) pillTop = tpl.height - pillHeight - 8;

      const radius = Math.round(pillHeight / 2);
      let pillFontEmbed = '';
      try {
        const interPath = path.resolve(process.cwd(), 'public', 'fonts', 'StretchPro.woff2');
        const fontBuf = await fs.readFile(interPath);
        pillFontEmbed = `@font-face{font-family:'StretchProEmbed';src:url(data:font/woff2;base64,${fontBuf.toString('base64')}) format('woff2');font-weight:400 700;font-display:swap;}`;
      } catch {}
      const dateSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<svg width="${pillWidth}" height="${pillHeight}" viewBox="0 0 ${pillWidth} ${pillHeight}" xmlns="http://www.w3.org/2000/svg">\n  ${pillFontEmbed ? `<style>${pillFontEmbed}</style>` : ''}\n  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'StretchProEmbed','Stretch Pro','Arial',sans-serif" font-size="${pillFont}px" font-weight="600" fill="white" letter-spacing="1">${escapeXml(fechaSmall)}<\/text>\n</svg>`);
      dateSvgRaster = await sharp(dateSvg, { density: 220 }).resize(pillWidth, pillHeight).png().toBuffer();
      composites.push({ input: dateSvgRaster, left: pillLeft, top: pillTop });
    }
  }
  // Build base image; avoid unnecessary resize (can blur text) if dimensions already match template.
  let base = sharp(templateInput);
  const metadata = await base.metadata();
  if (metadata.width !== tpl.width || metadata.height !== tpl.height) {
    base = base.resize(tpl.width, tpl.height, { fit: 'cover' });
  }
  const composite = base.composite(composites);

  if (format === 'png') {
    return await composite.png({ compressionLevel: 9 }).toBuffer();
  }
  return await composite.webp({ quality: 92 }).toBuffer();
}
