// QR helpers: genera DataURL PNG con configuración consistente.
// Client-safe QR helper (solo DataURL). La generación de buffers binarios vive en qr-server.ts
import QRCode from 'qrcode';

export async function generateQrPngDataUrl(text: string) {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, scale: 6 });
}

