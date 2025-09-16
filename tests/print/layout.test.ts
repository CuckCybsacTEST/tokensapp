import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import assemblePages from '@/lib/print/layout';

describe('assemblePages', () => {
  it('assembles 8 images into one A4 page buffer with correct dimensions', async () => {
    // Create 8 small images programmatically (each 200x300 px)
    const imgs: Buffer[] = [];
    for (let i = 0; i < 8; i++) {
      const buf = await sharp({ create: { width: 200, height: 300, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();
      imgs.push(buf);
    }

    const pages = await assemblePages(imgs, { dpi: 72, cols: 2, rows: 4, marginMm: 5, spacingMm: 3 });
    expect(Array.isArray(pages)).toBe(true);
    expect(pages.length).toBe(1);

    const meta = await sharp(pages[0]).metadata();
    // A4 at 72 DPI -> width = 210mm * 72 / 25.4 ≈ 595 pts/px
    const expectedWidth = Math.round((210 * 72) / 25.4);
    const expectedHeight = Math.round((297 * 72) / 25.4);
    expect(meta.width).toBe(expectedWidth);
    expect(meta.height).toBe(expectedHeight);
  });
});
