// QR helpers: genera DataURL PNG con configuración consistente.
import * as QRCode from "qrcode";

export async function generateQrPngDataUrl(text: string) {
  return QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, scale: 6 });
}

// Returns a PNG buffer of given size (width=height) for server-side composition.
export async function generateQrPngBuffer(text: string, size: number) {
  return QRCode.toBuffer(text, { errorCorrectionLevel: 'M', margin: 1, width: size });
}
