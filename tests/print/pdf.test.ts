import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import composePdfFromPagePngs from '@/lib/print/pdf';
import { PDFDocument } from 'pdf-lib';

describe('composePdfFromPagePngs', () => {
  it('creates a PDF with the same number of pages as input page buffers', async () => {
    // create 2 page PNGs programmatically as A4 at 72 DPI
    const width = Math.round((210 * 72) / 25.4);
    const height = Math.round((297 * 72) / 25.4);

    const pages: Buffer[] = [];
    for (let i = 0; i < 2; i++) {
      const buf = await sharp({ create: { width, height, channels: 3, background: { r: 240, g: 240, b: 240 } } }).png().toBuffer();
      pages.push(buf);
    }

    const pdfBuf = await composePdfFromPagePngs(pages, { dpi: 72 });
    expect(Buffer.isBuffer(pdfBuf)).toBe(true);

    const doc = await PDFDocument.load(pdfBuf);
    expect(doc.getPageCount()).toBe(2);
  });
});
