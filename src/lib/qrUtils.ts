import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export class QRUtils {
  /**
   * Genera un código QR único para una compra
   */
  static async generatePurchaseQR(purchaseData: {
    id: string;
    offerId: string;
    customerName: string;
    customerWhatsapp?: string;
    amount: number;
    createdAt: string;
  }): Promise<{ qrCode: string; qrDataUrl: string }> {
    // Generar código único
    const qrCode = `OFFER_${randomBytes(8).toString('hex').toUpperCase()}`;

    // Crear datos del QR
    const qrData = {
      type: 'offer_purchase',
      purchaseId: purchaseData.id,
      offerId: purchaseData.offerId,
      customerName: purchaseData.customerName,
      customerWhatsapp: purchaseData.customerWhatsapp,
      amount: purchaseData.amount,
      createdAt: purchaseData.createdAt,
      qrCode: qrCode
    };

    // Generar QR como Data URL
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return { qrCode, qrDataUrl };
  }

  /**
   * Valida y parsea datos de un código QR escaneado
   */
  static parseQRData(qrString: string): {
    type: string;
    purchaseId: string;
    offerId: string;
    customerName: string;
    customerWhatsapp?: string;
    amount: number;
    createdAt: string;
    qrCode: string;
  } | null {
    try {
      const data = JSON.parse(qrString);
      if (data.type === 'offer_purchase' && data.purchaseId && data.qrCode) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }
}