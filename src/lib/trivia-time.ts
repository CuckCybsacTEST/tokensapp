import { DateTime as LuxonDT } from 'luxon';

// Zona horaria de Lima
const LIMA_TIMEZONE = 'America/Lima';

/**
 * Obtiene la fecha/hora actual en zona horaria de Lima
 */
export function nowInLima(): ReturnType<typeof LuxonDT.now> {
  return LuxonDT.now().setZone(LIMA_TIMEZONE);
}

/**
 * Parsea una fecha ISO string y la convierte a zona horaria de Lima
 */
export function parseInLima(dateStr: string): ReturnType<typeof LuxonDT.now> {
  return LuxonDT.fromISO(dateStr).setZone(LIMA_TIMEZONE);
}

/**
 * Verifica si un premio es válido en el tiempo actual (zona Lima)
 */
export function isValidInLima(validFrom: ReturnType<typeof LuxonDT.now>, validUntil: ReturnType<typeof LuxonDT.now>): boolean {
  const now = nowInLima();
  return now >= validFrom && now <= validUntil;
}

/**
 * Verifica si un premio es válido basado en fechas ISO strings
 */
export function isPrizeValid(validFromStr: string, validUntilStr: string): boolean {
  const validFrom = parseInLima(validFromStr);
  const validUntil = parseInLima(validUntilStr);
  return isValidInLima(validFrom, validUntil);
}

/**
 * Formatea una fecha para mostrar en zona Lima
 */
export function formatInLima(date: any | string, format: string = 'dd/MM/yyyy HH:mm'): string {
  const { DateTime } = require('luxon');
  const dt = typeof date === 'string' ? DateTime.fromISO(date).setZone(LIMA_TIMEZONE) : date;
  return dt.toFormat(format);
}

/**
 * Convierte una fecha de Lima a UTC para guardar en BD
 */
export function limaToUtc(dateStr: string): Date {
  const { DateTime } = require('luxon');
  const dt = DateTime.fromISO(dateStr).setZone(LIMA_TIMEZONE);
  return dt.toUTC().toJSDate();
}

/**
 * Convierte una fecha UTC de BD a zona Lima para mostrar
 */
export function utcToLima(date: Date): ReturnType<typeof LuxonDT.now> {
  return LuxonDT.fromJSDate(date).setZone(LIMA_TIMEZONE);
}