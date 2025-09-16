import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

/**
 * Create a PDF from an array of page PNG buffers. Each buffer becomes one A4 page
 * with the image drawn full-bleed (covers the whole page). The function assumes
 * the page PNGs were rendered for the target physical size (A4) at the intended DPI.
 *
 * Notes on sizing:
 * - PDF uses points (1 point = 1/72 inch). To convert millimetres to points:
 *   points = mm * 72 / 25.4
 * - This function creates pages with A4 dimensions in points and draws the
 *   provided PNG to fill the page. If the PNG was generated using the same DPI
 *   as the intended print DPI, the physical sizes will match.
 */

const A4_MM = { width: 210, height: 297 };
function mmToPoints(mm: number): number {
  return (mm * 72) / 25.4;
}

export async function composePdfFromPagePngs(
  pageBuffers: Buffer[],
  options?: { dpi?: number; jpegQuality?: number }
): Promise<Buffer> {
  if (!Array.isArray(pageBuffers)) throw new TypeError('pageBuffers must be an array of Buffers');

  const pdfDoc = await PDFDocument.create();

  const pageWidthPts = mmToPoints(A4_MM.width);
  const pageHeightPts = mmToPoints(A4_MM.height);

  const jpegQuality = options?.jpegQuality ?? 80;

  for (const buf of pageBuffers) {
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('composePdfFromPagePngs: each pageBuffers item must be a Buffer');
    }

    // Convert the PNG page buffer to a compressed JPEG to reduce PDF size.
    // Sharp will decode the PNG and re-encode as JPEG with the provided quality.
    const jpegBuf = await sharp(buf).jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer();

    // Embed JPEG into PDF (pdf-lib supports embedJpg)
  const jpegUint8 = new Uint8Array(jpegBuf);
  const img = await pdfDoc.embedJpg(jpegUint8);

    const page = pdfDoc.addPage([pageWidthPts, pageHeightPts]);

    // Draw the image covering the full page.
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: pageWidthPts,
      height: pageHeightPts,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export default composePdfFromPagePngs;
