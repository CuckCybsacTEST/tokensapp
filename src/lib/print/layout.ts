import sharp from 'sharp';

/**
 * Options for assemblePages
 */
export type AssembleOptions = {
  dpi?: number; // default 300
  cols: number;
  rows: number;
  marginMm?: number; // outer margin in mm (default 5)
  spacingMm?: number; // gutter between cells in mm (default 3)
  background?: { r: number; g: number; b: number }; // default white
};

const A4_MM = { width: 210, height: 297 };

function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}

/**
 * Assemble images (PNG/JPG buffers) into A4 page images (PNG buffers) arranged in a grid.
 *
 * Calculations:
 * - px = mm * dpi / 25.4
 * - usable area = A4 - 2*margin
 * - cell size = (usable - (cols-1)*spacing) / cols
 *
 * Each input image is resized with fit='contain' into its cell and centered.
 */
export async function assemblePages(images: Buffer[], options: AssembleOptions): Promise<Buffer[]> {
  const dpi = options.dpi ?? 300;
  const cols = options.cols;
  const rows = options.rows;
  const marginMm = options.marginMm ?? 5;
  const spacingMm = options.spacingMm ?? 0.1; // default very narrow gutter (0.1mm); result may be 0 px at some DPIs
  const bg = options.background ?? { r: 255, g: 255, b: 255 };

  if (cols <= 0 || rows <= 0) throw new TypeError('cols and rows must be positive integers');

  // Page size in px
  const pageWidthPx = mmToPx(A4_MM.width, dpi);
  const pageHeightPx = mmToPx(A4_MM.height, dpi);

  // Convert margins/spacing to px. Use pixel-first arithmetic to avoid
  // cumulative rounding errors when converting mm -> px per-cell. Also
  // enforce a tiny minimum spacing in px so the gutter is visually very
  // fine for cutting (1 px at the target DPI).
  const marginPx = mmToPx(marginMm, dpi);
  let spacingPx = mmToPx(spacingMm, dpi);
  // Option 1: treat extremely small requested spacing as zero pixels so images
  // butt up against each other and avoid visible white gutters caused by
  // mm->px rounding. If caller explicitly passes a larger spacingMm it will
  // still be honored.
  if (spacingMm <= 0.05) {
    spacingPx = 0;
  }
  // Ensure non-negative as a final guard
  if (spacingPx < 0) spacingPx = 0;

  // Usable area in px
  const usableWidthPx = pageWidthPx - 2 * marginPx;
  const usableHeightPx = pageHeightPx - 2 * marginPx;

  // Cell size in px. Floor to avoid overflow; any leftover pixel(s) will be
  // absorbed into the right/bottom margins (negligible) rather than creating
  // visible extra gutters between cells.
  const cellWidthPx = Math.floor((usableWidthPx - (cols - 1) * spacingPx) / cols);
  const cellHeightPx = Math.floor((usableHeightPx - (rows - 1) * spacingPx) / rows);

  const pages: Buffer[] = [];

  // Process images in pages of cols*rows
  const perPage = cols * rows;
  for (let i = 0; i < images.length; i += perPage) {
    const pageImages = images.slice(i, i + perPage);

    // create blank page
    const page = sharp({
      create: {
        width: pageWidthPx,
        height: pageHeightPx,
        channels: 3,
        background: { r: bg.r, g: bg.g, b: bg.b },
      },
    }).png();

    const composites: { input: Buffer; left: number; top: number }[] = [];

    // If spacing was forced to zero (very tight layout), apply a tiny
    // 1-pixel overlap between adjacent cells to avoid visible seams caused
    // by antialiasing / rounding when images touch exactly. This is a
    // conservative, visually invisible overlap that eliminates white lines.
    const overlapPx = spacingMm <= 0.05 ? 1 : 0;

    for (let idx = 0; idx < perPage; idx++) {
      const imgBuffer = pageImages[idx];
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      // Apply per-column/per-row overlap when applicable
      let left = marginPx + col * (cellWidthPx + spacingPx) - col * overlapPx;
      let top = marginPx + row * (cellHeightPx + spacingPx) - row * overlapPx;
      if (left < 0) left = 0;
      if (top < 0) top = 0;

      if (!imgBuffer) {
        // empty cell, skip
        continue;
      }

      // Resize image to fit within the cell (both width and height), preserving
      // aspect ratio, then center it. Using both width and height with fit='contain'
      // guarantees the resized image will not overflow the cell and avoids the
      // issue where a very wide image spills across the whole page.
      // Compute extra resize so the image slightly overlaps adjacent cells
      // when overlap is enabled. Only expand toward the right/bottom for
      // non-last columns/rows to avoid overflowing the page edges.
      const extraWidth = overlapPx > 0 && col < cols - 1 ? overlapPx : 0;
      const extraHeight = overlapPx > 0 && row < rows - 1 ? overlapPx : 0;

      // Ensure the resized image has an opaque background matching the page
      // background to avoid semi-transparent padding pixels which can produce
      // visible seams when composited onto the page. We use flatten() to remove
      // alpha and guarantee fully opaque pixels. Resize target includes extras.
      let resized = await sharp(imgBuffer)
        .resize({ width: cellWidthPx + extraWidth, height: cellHeightPx + extraHeight, fit: 'contain', background: { r: bg.r, g: bg.g, b: bg.b, alpha: 1 } })
        .flatten({ background: { r: bg.r, g: bg.g, b: bg.b } })
        .png()
        .toBuffer();

      // Measure resized dimensions to compute centered offsets
      let meta = await sharp(resized).metadata();
      let resizedW = meta.width ?? cellWidthPx;
      let resizedH = meta.height ?? cellHeightPx;

      // Defensive: if metadata reports the resized image is still bigger than the
      // cell (rare), perform a stricter resize with fit:'inside' to guarantee it
      // fits. This prevents cases where source images unexpectedly ignore the
      // initial resize and would spill across the page.
      if (resizedW > cellWidthPx || resizedH > cellHeightPx) {
  const corrected = await sharp(resized).resize({ width: cellWidthPx, height: cellHeightPx, fit: 'inside', withoutEnlargement: true }).flatten({ background: { r: bg.r, g: bg.g, b: bg.b } }).png().toBuffer();
        meta = await sharp(corrected).metadata();
        resizedW = meta.width ?? Math.min(cellWidthPx, resizedW);
        resizedH = meta.height ?? Math.min(cellHeightPx, resizedH);
        // replace resized with corrected buffer
        // (we'll use corrected in the composite below)
        // Note: assign resized variable to corrected buffer
        // so the composite uses the corrected image
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        resized = corrected;
      }

  // Adjust offsets so the extra pixels overlap neighbors. We center the
  // resized image relative to the cell, then shift by half the extra to
  // distribute overlap evenly; this avoids visual shifts.
  const offsetLeft = left - Math.floor(extraWidth / 2) + Math.round((cellWidthPx - resizedW + extraWidth) / 2);
  const offsetTop = top - Math.floor(extraHeight / 2) + Math.round((cellHeightPx - resizedH + extraHeight) / 2);

      composites.push({ input: resized, left: offsetLeft, top: offsetTop });
    }

    const composed = await page.composite(composites).png().toBuffer();
    pages.push(composed);
  }

  // If no images, return a single blank page
  if (pages.length === 0) {
    const blank = await sharp({ create: { width: pageWidthPx, height: pageHeightPx, channels: 3, background: { r: bg.r, g: bg.g, b: bg.b } } }).png().toBuffer();
    return [blank];
  }

  return pages;
}

export default assemblePages;
