import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { generateQrPngDataUrl } from '@/lib/qr';
import composeTemplateWithQr from '@/lib/print/compose';

describe('composeTemplateWithQr', () => {
  it('composes a small template with QR and returns PNG buffer with expected dimensions', async () => {
    // create a small template programmatically (200x300 px)
    const template = await sharp({ create: { width: 200, height: 300, channels: 3, background: { r: 240, g: 240, b: 240 } } }).png().toBuffer();

    // write to a temp file because compose expects a file path
    const tmpPath = './tmp_test_template.png';
    await sharp(template).toFile(tmpPath);

    const url = 'https://example.com/r/test-token-123';
    const dataUrl = await generateQrPngDataUrl(url);
    // helper inside project might return dataURL
    const base64 = dataUrl.split(',')[1];
    const qrBuf = Buffer.from(base64, 'base64');

    const composed = await composeTemplateWithQr({ templatePath: tmpPath, qrBuffer: qrBuf, qrMetadata: { xMm: 10, yMm: 10, widthMm: 20 }, dpi: 72 });
    expect(Buffer.isBuffer(composed)).toBe(true);

    const meta = await sharp(composed).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(300);
  });
});
