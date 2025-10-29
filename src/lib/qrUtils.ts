import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export class QRUtils {
  /**
   * Genera un código QR único para una compra con todos los datos de la oferta
   */
  static async generatePurchaseQR(purchaseData: {
    id: string;
    offerId: string;
    customerName: string;
    customerWhatsapp?: string;
    amount: number;
    createdAt: string;
    // Datos completos de la oferta
    offer: {
      id: string;
      title: string;
      price: number;
      isActive: boolean;
      validFrom?: Date | string | null;
      validUntil?: Date | string | null;
      timezone: string;
      availableDays: number[];
      startTime?: string | null;
      endTime?: string | null;
      maxQuantity?: number | null;
    };
  }): Promise<{ qrCode: string; qrDataUrl: string }> {
    // Generar código único
    const qrCode = `OFFER_${randomBytes(8).toString('hex').toUpperCase()}`;

    // Crear datos del QR con información completa
    const qrData = {
      type: 'offer_purchase',
      purchaseId: purchaseData.id,
      offerId: purchaseData.offerId,
      customerName: purchaseData.customerName,
      customerWhatsapp: purchaseData.customerWhatsapp,
      amount: purchaseData.amount,
      createdAt: purchaseData.createdAt,
      qrCode: qrCode,
      // Información completa de la oferta para validación offline
      offer: {
        id: purchaseData.offer.id,
        title: purchaseData.offer.title,
        price: purchaseData.amount, // Usar el monto pagado como precio
        isActive: purchaseData.offer.isActive,
        validFrom: purchaseData.offer.validFrom instanceof Date ? purchaseData.offer.validFrom.toISOString() : purchaseData.offer.validFrom || null,
        validUntil: purchaseData.offer.validUntil instanceof Date ? purchaseData.offer.validUntil.toISOString() : purchaseData.offer.validUntil || null,
        timezone: purchaseData.offer.timezone,
        availableDays: purchaseData.offer.availableDays,
        startTime: purchaseData.offer.startTime,
        endTime: purchaseData.offer.endTime,
        maxQuantity: purchaseData.offer.maxQuantity
      }
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
    offer: {
      id: string;
      title: string;
      price: number;
      isActive: boolean;
      validFrom?: string | null;
      validUntil?: string | null;
      timezone: string;
      availableDays: number[];
      startTime?: string | null;
      endTime?: string | null;
      maxQuantity?: number | null;
    };
  } | null {
    try {
      const data = JSON.parse(qrString);
      if (data.type === 'offer_purchase' && data.purchaseId && data.qrCode && data.offer) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }
}