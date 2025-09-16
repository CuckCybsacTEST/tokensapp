import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Metadata that describes where the QR must be placed on the template, in millimetres.
 */
export type QrMetadata = {
  xMm: number; // distance from left edge in mm
  yMm: number; // distance from top edge in mm
  widthMm: number; // target width of the QR in mm
  rotationDeg?: number; // optional clockwise rotation in degrees
};

/**
 * Options for composeTemplateWithQr
 */
export type ComposeOpts = {
  templatePath: string; // path to PNG/JPG template (relative or absolute)
  qrBuffer: Buffer; // PNG Buffer for the QR image
  qrMetadata: QrMetadata;
  dpi?: number; // DPI used to convert mm -> px, default 300
  // future options could include background flatten behaviour, outputFormat, etc.
};

/**
 * Convert millimetres to pixels at the provided DPI.
 */
function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}

/**
 * Compose a template image (PNG/JPG) with a QR image positioned according to mm coordinates.
 *
 * Behaviour and assumptions:
 * - Coordinates are in millimetres with origin at the top-left of the physical template.
 * - The function converts mm -> px using the provided `dpi` (default 300). That means the
 *   template image is interpreted as if it will be printed at the same DPI. If your template
 *   was created at a different DPI, supply a matching `dpi` or re-export the template accordingly.
 * - The provided `qrBuffer` must be an image Buffer (PNG recommended). The helper will resize
 *   the QR to the requested width (keeping aspect ratio) and apply optional rotation.
 * - The function returns a PNG Buffer ready to be embedded into a PDF.
 *
 * Errors:
 * - Throws when the template path does not exist or when inputs are invalid.
 */
export async function composeTemplateWithQr(opts: ComposeOpts): Promise<Buffer> {
  const { templatePath, qrBuffer, qrMetadata, dpi = 300 } = opts;

  if (!templatePath || typeof templatePath !== 'string') {
    throw new TypeError('composeTemplateWithQr: templatePath must be a non-empty string');
  }

  if (!Buffer.isBuffer(qrBuffer)) {
    throw new TypeError('composeTemplateWithQr: qrBuffer must be a Buffer (PNG recommended)');
  }

  const resolvedPath = path.isAbsolute(templatePath)
    ? templatePath
    : path.resolve(process.cwd(), templatePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`composeTemplateWithQr: template file not found: ${resolvedPath}`);
  }

  // Convert mm to px based on DPI for placement. NOTE: QR physical size is
  // forced to a fixed pixel size below (230x230) per product requirement.
  const qrWidthPx = mmToPx(qrMetadata.widthMm, dpi);
  const qrLeftPx = mmToPx(qrMetadata.xMm, dpi);
  const qrTopPx = mmToPx(qrMetadata.yMm, dpi);

  // Read template metadata so we can ensure the QR we composite will not be
  // larger than the template. Sharp throws if the overlay is bigger than the base.
  const templateMeta = await sharp(resolvedPath).metadata();
  const templateWidth = templateMeta.width ?? 0;
  const templateHeight = templateMeta.height ?? 0;

  if (!templateWidth || !templateHeight) {
    throw new Error(`composeTemplateWithQr: unable to determine template dimensions for ${resolvedPath}`);
  }

  // Prepare the resized (and possibly rotated) QR image as a Buffer.
  // Business rule: QR must be square 230x230 px. Clamp to template dimensions
  // to avoid overflow on small template images.
  let qrProcessedBuffer: Buffer;
  const TARGET_QR_PX = 230;
  const finalQrPx = Math.max(1, Math.min(TARGET_QR_PX, Math.min(templateWidth, templateHeight)));
  try {
  // Force the QR to the fixed square size (finalQrPx x finalQrPx).
  // Use fit:'contain' with transparent background so the QR is centered
  // within a square canvas and the resulting PNG has exact dimensions.
  let qrSharp = sharp(qrBuffer).resize({ width: finalQrPx, height: finalQrPx, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });

    if (qrMetadata.rotationDeg && Number(qrMetadata.rotationDeg) !== 0) {
      // rotate keeps transparent background by default for PNG inputs
      qrSharp = qrSharp.rotate(qrMetadata.rotationDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
    }

  // Ensure output is PNG so transparency is preserved and we can read exact
  // pixel dimensions right after processing.
  qrProcessedBuffer = await qrSharp.png().toBuffer();
  } catch (err: any) {
    throw new Error(`composeTemplateWithQr: failed to process QR buffer: ${err?.message || err}`);
  }

  // Read template and composite
  try {
    const template = sharp(resolvedPath);

    // We don't change the template's dimensions; we place the QR at the pixel coordinates
    // computed from mm and dpi. If the template was created at a different DPI, the
    // physical placement will differ — caller must ensure template/dpi match.

    // Clamp left/top to keep the QR inside the template bounds
    const qrProcessedMeta = await sharp(qrProcessedBuffer).metadata();
  const qrProcessedW = qrProcessedMeta.width ?? finalQrPx;
    const qrProcessedH = qrProcessedMeta.height ?? qrProcessedW;

    // Default placement from metadata mm coords
    let left = qrLeftPx;
    let top = qrTopPx;

    // Heuristic: detect a large near-white rectangle (the box where the QR
    // should go) and center the QR inside it. This helps when templates
    // include a printed white box to receive an overlaid QR.
  async function detectWhiteBox(pathToImage: string, targetW: number, targetH: number): Promise<{ left: number; top: number; width: number; height: number } | null> {
      try {
        // Downscale for speed while keeping aspect ratio
        const maxScanWidth = 800;
        const scale = templateWidth > maxScanWidth ? Math.ceil(templateWidth / maxScanWidth) : 1;
        const smallW = Math.floor(templateWidth / scale);
        const smallH = Math.floor(templateHeight / scale);

        const { data, info } = await sharp(pathToImage).resize(smallW, smallH).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const threshold = 240; // near-white threshold

        // compute per-column and per-row white fractions
        const colsWhiteFrac: number[] = new Array(info.width).fill(0);
        const rowsWhiteFrac: number[] = new Array(info.height).fill(0);
        for (let y = 0; y < info.height; y++) {
          let rowWhite = 0;
          for (let x = 0; x < info.width; x++) {
            const idx = (y * info.width + x) * info.channels;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const isWhite = r >= threshold && g >= threshold && b >= threshold;
            if (isWhite) {
              rowWhite++;
              colsWhiteFrac[x]++;
            }
          }
          rowsWhiteFrac[y] = rowWhite / info.width;
        }
        for (let x = 0; x < info.width; x++) colsWhiteFrac[x] = colsWhiteFrac[x] / info.height;

        // find contiguous column spans with high white fraction
        function findSpans(arr: number[], minFrac = 0.9, minLen = 2) {
          const spans: { start: number; end: number; len: number }[] = [];
          let curStart = -1;
          for (let i = 0; i < arr.length; i++) {
            if (arr[i] >= minFrac) {
              if (curStart === -1) curStart = i;
            } else {
              if (curStart !== -1) {
                const len = i - curStart;
                if (len >= minLen) spans.push({ start: curStart, end: i - 1, len });
                curStart = -1;
              }
            }
          }
          if (curStart !== -1) {
            const len = arr.length - curStart;
            if (len >= minLen) spans.push({ start: curStart, end: arr.length - 1, len });
          }
          return spans;
        }

        const colSpans = findSpans(colsWhiteFrac, 0.88, Math.max(4, Math.floor(info.width * 0.02)));
        const rowSpans = findSpans(rowsWhiteFrac, 0.88, Math.max(4, Math.floor(info.height * 0.01)));
        if (colSpans.length === 0 || rowSpans.length === 0) return null;

        // Evaluate candidate boxes combining column spans and row spans and pick
        // the one whose size best matches the target QR size (in original px)
        let best: { left: number; top: number; width: number; height: number; score: number } | null = null;
        for (const cs of colSpans) {
          for (const rs of rowSpans) {
            const boxLeft = cs.start * scale;
            const boxTop = rs.start * scale;
            const boxWidth = (cs.end - cs.start + 1) * scale;
            const boxHeight = (rs.end - rs.start + 1) * scale;
            // ignore tiny boxes
            if (boxWidth * boxHeight < (templateWidth * templateHeight) * 0.0005) continue;
            // score by how close box dims are to target dims (relative error)
            const wErr = Math.abs(boxWidth - targetW) / Math.max(1, targetW);
            const hErr = Math.abs(boxHeight - targetH) / Math.max(1, targetH);
            const score = wErr + hErr + (boxLeft < templateWidth * 0.05 ? 0.5 : 0); // penalize boxes too close to left edge
            if (!best || score < best.score) best = { left: boxLeft, top: boxTop, width: boxWidth, height: boxHeight, score };
          }
        }
        if (!best) return null;
        return { left: best.left, top: best.top, width: best.width, height: best.height };
      } catch (e) {
        return null;
      }
    }

  const whiteBox = await detectWhiteBox(resolvedPath, qrProcessedW, qrProcessedH);
    if (whiteBox) {
      // center QR in white box
      left = whiteBox.left + Math.round((whiteBox.width - qrProcessedW) / 2);
      top = whiteBox.top + Math.round((whiteBox.height - qrProcessedH) / 2);
    }
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left + qrProcessedW > templateWidth) left = Math.max(0, templateWidth - qrProcessedW);
    if (top + qrProcessedH > templateHeight) top = Math.max(0, templateHeight - qrProcessedH);

    // OPTION A: force horizontal placement to 1530 px from the left as requested.
    // Clamp to template bounds so the QR never overflows the template.
    try {
      const forcedLeftPx = 1530;
      left = Math.min(Math.max(0, forcedLeftPx), Math.max(0, templateWidth - qrProcessedW));
    } catch (e) {
      // ignore and keep computed left if anything goes wrong
    }

    // Also force vertical padding: ensure ~81px above and below the QR.
    // If a white box was detected, place QR at whiteBox.top + 81; otherwise
    // fall back to an absolute 81 px from top. Clamp to template bounds.
    try {
      const desiredTop = (typeof whiteBox !== 'undefined' && whiteBox) ? (whiteBox.top + 81) : 81;
      top = Math.min(Math.max(0, Math.round(desiredTop)), Math.max(0, templateHeight - qrProcessedH));
    } catch (e) {
      // ignore and keep computed top
    }

    const composed = await template
      .composite([
        {
          input: qrProcessedBuffer,
          left,
          top,
        },
      ])
      .png()
      .toBuffer();

    return composed;
  } catch (err: any) {
    throw new Error(`composeTemplateWithQr: failed to composite template: ${err?.message || err}`);
  }
}

export default composeTemplateWithQr;
