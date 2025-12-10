// Utilidades para el sistema de QR personalizado
import crypto from 'crypto';
import { generateQrPngDataUrl } from '@/lib/qr';

// Configuración HMAC para firmas de QR
const HMAC_SECRET = process.env.CUSTOM_QR_HMAC_SECRET || 'custom-qr-secret-key';
const SIGNATURE_VERSION = 1;

// Temas disponibles para QR personalizado
export const QR_THEMES = {
  default: {
    qrColor: '#000000',
    backgroundColor: '#FFFFFF',
    name: 'Default'
  },
  christmas: {
    qrColor: '#DC2626',
    backgroundColor: '#FEF3C7',
    name: 'Navidad'
  },
  halloween: {
    qrColor: '#F97316',
    backgroundColor: '#451A03',
    name: 'Halloween'
  },
  summer: {
    qrColor: '#059669',
    backgroundColor: '#ECFDF5',
    name: 'Verano'
  },
  birthday: {
    qrColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
    name: 'Cumpleaños'
  }
} as const;

export type QrTheme = keyof typeof QR_THEMES;

// Campos dinámicos configurables para el formulario
export const FORM_FIELDS = {
  customerName: {
    key: 'customerName',
    label: 'Nombre completo',
    type: 'text',
    required: true,
    placeholder: 'Ingresa tu nombre completo'
  },
  customerWhatsapp: {
    key: 'customerWhatsapp',
    label: 'WhatsApp',
    type: 'tel',
    required: true,
    placeholder: '+51 999 999 999'
  },
  customerDni: {
    key: 'customerDni',
    label: 'DNI',
    type: 'text',
    required: false,
    placeholder: 'Ingresa tu DNI (opcional)'
  },
  customerPhrase: {
    key: 'customerPhrase',
    label: 'Frase personal',
    type: 'text',
    required: false,
    placeholder: 'Una frase especial para ti...'
  },
  customData: {
    key: 'customData',
    label: 'Dato adicional',
    type: 'text',
    required: false,
    placeholder: 'Información adicional...'
  }
} as const;

export type FormFieldKey = keyof typeof FORM_FIELDS;

// Generar código único para QR
export function generateQrCode(): string {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

// Generar firma HMAC para validar QR
export function generateSignature(code: string, data: any): string {
  const payload = JSON.stringify({
    code,
    data,
    version: SIGNATURE_VERSION
  });

  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(payload)
    .digest('hex');
}

// Verificar firma HMAC
export function verifySignature(code: string, data: any, signature: string): boolean {
  try {
    const expectedSignature = generateSignature(code, data);
    return signature === expectedSignature;
  } catch (error) {
    return false;
  }
}

// Preparar datos para firma de manera consistente (sin createdAt para evitar discrepancias)
export function prepareQrDataForSignature(data: {
  customerName: string;
  customerWhatsapp: string;
  customerDni: string | null;
  customerPhrase: string | null;
  customData: string | null;
  theme: string;
}): any {
  return {
    customerName: data.customerName,
    customerWhatsapp: data.customerWhatsapp,
    customerDni: data.customerDni || null,
    customerPhrase: data.customerPhrase || null,
    customData: data.customData || null,
    theme: data.theme
  };
}

// Generar QR con tema personalizado
export async function generateCustomQrDataUrl(
  redeemUrl: string,
  theme: QrTheme = 'default'
): Promise<string> {
  // Por ahora usamos la función estándar, pero podríamos extenderla
  // para incluir colores personalizados en el futuro
  return generateQrPngDataUrl(redeemUrl);
}

// Validar número de WhatsApp peruano
export function isValidPeruvianWhatsapp(phone: string): boolean {
  // Remover todos los caracteres no numéricos
  const cleanPhone = phone.replace(/\D/g, '');

  // Validar formato peruano: debe empezar con 9 y tener 9 dígitos
  // O incluir código de país +51
  if (cleanPhone.startsWith('519')) {
    return cleanPhone.length === 11; // +51 9XXXXXXXX
  } else if (cleanPhone.startsWith('9')) {
    return cleanPhone.length === 9; // 9XXXXXXXX
  }

  return false;
}

// Normalizar número de WhatsApp
export function normalizeWhatsapp(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');

  // Si ya incluye +51, devolver tal cual
  if (cleanPhone.startsWith('51')) {
    return cleanPhone;
  }

  // Si empieza con 9, agregar código de país
  if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
    return `51${cleanPhone}`;
  }

  return cleanPhone;
}

// Validar nombre (mínimo 2 palabras, caracteres alfabéticos)
export function isValidName(name: string): boolean {
  if (typeof name !== 'string') return false;

  const trimmed = name.trim();
  if (trimmed.length < 5) return false; // Mínimo 5 caracteres

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return false; // Mínimo nombre + apellido

  // Cada parte debe tener al menos 2 caracteres alfabéticos
  return parts.every(part =>
    /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'-]{2,}$/u.test(part)
  );
}

// Validar DNI peruano (8 dígitos)
export function isValidPeruvianDni(dni: string): boolean {
  if (typeof dni !== 'string') return false;
  
  const trimmed = dni.trim();
  if (trimmed.length === 0) return true; // DNI opcional, vacío es válido
  
  // DNI debe tener exactamente 8 dígitos
  return /^\d{8}$/.test(trimmed);
}

// Generar URL de redención para QR personalizado
export function generateRedeemUrl(code: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/qr/${code}`;
}

// Calcular fecha de expiración (por defecto 30 días)
export function calculateExpiryDate(days: number = 30): Date {
  const now = new Date();
  // Usar zona horaria de Lima, Perú
  const limaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Lima"}));
  limaTime.setDate(limaTime.getDate() + days);
  return limaTime;
}

// Formatear fecha para Lima, Perú
export function formatDateForLima(date: Date): string {
  return date.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Estadísticas básicas
export interface QrStats {
  totalCreated: number;
  totalRedeemed: number;
  totalActive: number;
  totalExpired: number;
  createdToday: number;
  redeemedToday: number;
  byTheme: Record<string, number>;
  byCampaign: Record<string, number>;
}

// Configuración de campos dinámicos
export interface FormConfig {
  fields: FormFieldKey[];
  theme: QrTheme;
  expiryDays: number;
  campaignName?: string;
}