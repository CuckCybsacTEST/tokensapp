import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { inviteTemplates, InviteTemplateKind } from './inviteTemplates';
import { generateQrPngBuffer } from '@/lib/qr';

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function escapeXml(s: string) { return s.replace(/[&<>"] /g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',' ':' ' }[c] as string)); }
function formatFecha(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const dia = d.getDate().toString().padStart(2,'0');
    const mes = d.toLocaleDateString('es-PE',{ month:'long'}).toLowerCase();
    return `${dia} ${mes}`; // ej: 07 junio
  } catch { return ''; }
}

// Helper to build final card image buffer (webp by default)
export async function generateInviteCard(
  kind: InviteTemplateKind,
  code: string,
  redeemUrl: string,
  format: 'webp' | 'png' = 'webp',
  celebrantName?: string,
  reservationDateISO?: string,
) {
  const tpl = inviteTemplates[kind];
  const absPath = path.join(process.cwd(), tpl.path); // path relative to project root
  let templateInput: Buffer | null = null;
  try {
    templateInput = await fs.readFile(absPath);
  } catch {
    // Fallback: create a dark gradient-ish plain background so we still deliver a card.
    templateInput = await sharp({ create: { width: tpl.width, height: tpl.height, channels: 4, background: { r: 12, g: 12, b: 12, alpha: 1 } } })
      .png()
      .toBuffer();
  }

  // QR square size
  const qrSize = Math.round(tpl.width * tpl.area.sizeRatio);
  const left = Math.round(tpl.width * tpl.area.leftRatio);
  const top = Math.round(tpl.height * tpl.area.topRatio);

  const qrPng = await generateQrPngBuffer(redeemUrl, qrSize);
  // Create rounded-corner mask for QR (applies to both host & guest)
  const cornerR = Math.round(qrSize * 0.08);
  const qrMaskSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><svg width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${qrSize}" height="${qrSize}" rx="${cornerR}" ry="${cornerR}" fill="white"/></svg>`);
  const roundedQr = await sharp(qrPng).composite([{ input: qrMaskSvg, blend: 'dest-in' }]).png().toBuffer();

  // Compose
  const composites: sharp.OverlayOptions[] = [ { input: roundedQr, top, left } ];

  // Subtle date overlay just above QR (if date available)
  if (reservationDateISO) {
    const fechaSmall = formatFecha(reservationDateISO).toUpperCase();
    const pillFont = Math.max(18, Math.round(qrSize * 0.06)); // scale with QR size
    const horizontalPadding = Math.round(pillFont * 0.9);
    const textApproxWidth = fechaSmall.length * pillFont * 0.55; // heuristic width per char
    const pillWidth = Math.round(textApproxWidth + horizontalPadding * 2);
    const pillHeight = Math.round(pillFont * 1.9);
    const pillLeft = left + Math.round((qrSize - pillWidth) / 2);
    const marginBottom = Math.round(pillFont * 0.6);
    let pillTop = top - pillHeight - marginBottom;
    if (pillTop < 8) pillTop = 8; // clamp
    const radius = Math.round(pillHeight / 2);
    // Render pill SVG at higher density to reduce text blur in production
    const dateSvg = Buffer.from(`<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg width=\"${pillWidth}\" height=\"${pillHeight}\" viewBox=\"0 0 ${pillWidth} ${pillHeight}\" xmlns=\"http://www.w3.org/2000/svg\">\n  <defs>\n    <filter id=\"shadow\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\">\n      <feDropShadow dx=\"0\" dy=\"2\" stdDeviation=\"3\" flood-opacity=\"0.35\"/>\n    </filter>\n  </defs>\n  <rect x=\"0\" y=\"0\" width=\"${pillWidth}\" height=\"${pillHeight}\" rx=\"${radius}\" ry=\"${radius}\" fill=\"rgba(0,0,0,0.55)\" />\n  <text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-family=\"'Inter','Arial',sans-serif\" font-size=\"${pillFont}px\" font-weight=\"600\" fill=\"#FFFFFF\" filter=\"url(#shadow)\" letter-spacing=\"1\">${escapeXml(fechaSmall)}<\/text>\n</svg>`);
    const dateSvgRaster = await sharp(dateSvg, { density: 220 }).png().toBuffer();
    composites.push({ input: dateSvgRaster, left: pillLeft, top: pillTop });
  }

  // Adaptive footer for both guest & host (if nameBar provided)
  if ((kind === 'guest' || kind === 'host') && celebrantName && (tpl as any).nameBar) {
    const nb = (tpl as any).nameBar as { leftRatio: number; widthRatio: number; topRatio: number; heightRatio: number };
    const barWidth = Math.round(tpl.width * nb.widthRatio);
    const baseBarHeight = Math.round(tpl.height * nb.heightRatio);
    const barLeft = Math.round(tpl.width * nb.leftRatio);
    const baseBarTop = Math.round(tpl.height * nb.topRatio);
    const first = celebrantName.trim().split(/\s+/)[0];
    const fechaTxt = reservationDateISO ? formatFecha(reservationDateISO) : '';
    const fullPhrase = (kind === 'guest'
      ? `Esta es una invitación a la fiesta de ${first}`
      : `PASE PARA ${first}, EL/LA CUMPLEAÑER@`).toUpperCase();
    const maxWidth = barWidth - 40;
    const approxChar = (h: number) => h * 0.58;
    const singleFont = (h: number) => clamp(Math.floor(h * 0.46), 20, 56);
    let barHeight = baseBarHeight;
    let phraseLines: string[] = [fullPhrase];
    // Force canonical two-line layout for host: line 1 = PASE PARA NAME, line 2 = EL/LA CUMPLEAÑER@
    if (kind === 'host') {
      phraseLines = [`PASE PARA ${first.toUpperCase()},`, 'EL/LA CUMPLEAÑER@'];
      barHeight = Math.round(baseBarHeight * 1.35);
    }
    let f1 = singleFont(barHeight);
    if (kind !== 'host') {
      let widthEstimate = fullPhrase.length * approxChar(f1);
      if (widthEstimate > maxWidth) {
        const pivot = ' A LA FIESTA DE ';
        const idx = fullPhrase.indexOf(pivot.toUpperCase());
        if (idx > 0) {
          phraseLines = [fullPhrase.slice(0, idx), fullPhrase.slice(idx + 1)];
        } else {
          const mid = Math.floor(fullPhrase.length / 2);
          phraseLines = [fullPhrase.slice(0, mid), fullPhrase.slice(mid)];
        }
        barHeight = Math.round(baseBarHeight * 1.45);
        f1 = clamp(Math.floor(barHeight * 0.34), 18, 48);
      }
    } else {
      f1 = clamp(Math.floor(barHeight * 0.34), 18, 48);
    }
    const f2 = clamp(Math.floor(barHeight * 0.30), 16, 42);
    const gap = clamp(Math.floor(barHeight * 0.09), 4, 24);
    const effectiveGap = phraseLines.length > 1 ? Math.max(4, Math.floor(gap * 0.8)) : gap;
    const strokeW = clamp(Math.round(barHeight * 0.05), 2, 8);
    const radius = Math.min(Math.round(barHeight * 0.45), 38);
    const bottomY = baseBarTop + baseBarHeight; // preserve original bottom
    const barTop = bottomY - barHeight;
    const inset = strokeW / 2;
    const dateColor = '#c8c8c8';
    const linesHeight = phraseLines.length * f1 + (phraseLines.length - 1) * effectiveGap;
    const blockHeight = linesHeight + effectiveGap + f2;
  // Desplazamos ligeramente hacia abajo el bloque de texto para mejor alineación visual
  const verticalBias = Math.round(barHeight * 0.16); // desplazado aún más hacia abajo
    let cursorY = Math.round((barHeight - blockHeight)/2) + verticalBias + f1 * 0.82;
    const highlightColor = '#FFD36A';
    const firstUpper = first.toUpperCase();
    let textSvg = '';
    for (const line of phraseLines) {
      const idx = line.indexOf(firstUpper);
      if (idx >= 0) {
        const before = line.slice(0, idx);
        const namePart = line.slice(idx, idx + firstUpper.length);
        const after = line.slice(idx + firstUpper.length);
        textSvg += `  <text x="50%" y="${cursorY}" text-anchor="middle" fill="white" font-family="'Inter','Arial',sans-serif" font-weight="600" font-size="${f1}px">${escapeXml(before)}<tspan fill="${highlightColor}">${escapeXml(namePart)}</tspan>${escapeXml(after)}</text>\n`;
      } else {
        textSvg += `  <text x="50%" y="${cursorY}" text-anchor="middle" fill="white" font-family="'Inter','Arial',sans-serif" font-weight="600" font-size="${f1}px">${escapeXml(line)}</text>\n`;
      }
      cursorY += f1 + effectiveGap;
    }
    textSvg += `  <text x="50%" y="${cursorY + f2 * 0.85}" text-anchor="middle" fill="${dateColor}" font-family="'Inter','Arial',sans-serif" font-weight="700" font-size="${f2}px" letter-spacing="1">${escapeXml(fechaTxt)}</text>\n`;
    const nameBarSvg = Buffer.from(`<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg width=\"${barWidth}\" height=\"${barHeight}\" viewBox=\"0 0 ${barWidth} ${barHeight}\" xmlns=\"http://www.w3.org/2000/svg\">\n  <defs>\n    <linearGradient id=\"ograd\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"0%\">\n      <stop offset=\"0%\" stop-color=\"#FF7A00\"/>\n      <stop offset=\"40%\" stop-color=\"#FFA630\"/>\n      <stop offset=\"60%\" stop-color=\"#FFB347\"/>\n      <stop offset=\"100%\" stop-color=\"#FF7A00\"/>\n    </linearGradient>\n  </defs>\n  <rect x=\"${inset}\" y=\"${inset}\" width=\"${barWidth - strokeW}\" height=\"${barHeight - strokeW}\" rx=\"${radius}\" ry=\"${radius}\" fill=\"black\" stroke=\"url(#ograd)\" stroke-width=\"${strokeW}\" />\n${textSvg}</svg>`);
    const nameBarRaster = await sharp(nameBarSvg, { density: 230 }).png().toBuffer();
    composites.push({ input: nameBarRaster, left: barLeft, top: barTop });
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
