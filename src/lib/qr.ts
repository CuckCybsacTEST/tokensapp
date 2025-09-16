// QR helpers: genera DataURL PNG con configuración consistente.
import * as QRCode from "qrcode";

export async function generateQrPngDataUrl(text: string) {
  return QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, scale: 6 });
}
