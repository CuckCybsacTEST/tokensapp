/**
 * Cálculo de "día de trabajo" (business day) desplazado para jornadas que inician tarde y
 * pueden cerrar después de medianoche local.
 *
 * Supuesto de operación: zona horaria fija America/Lima (UTC-5, sin DST efectivo).
 *
 * Idea central:
 *   Queremos que todas las marcas (IN/OUT) ocurridas entre, por ejemplo, las 10:00 AM locales
 *   de un día y antes de las 10:00 AM locales del día siguiente pertenezcan al mismo
 *   "día de trabajo" (businessDay) etiquetado por la fecha (YYYY-MM-DD) del día en que comenzó
 *   esa ventana.
 *
 * Fórmula sin usar librerías de time zone:
 *   1. Tomamos el instante en UTC (Date almacena ms UTC siempre).
 *   2. Trasladamos (restamos) horas = (cutoffHourLocal + LIMA_TZ_OFFSET) para "re-centrar"
 *      la medianoche: así convertimos la ventana [cutoff..cutoff) local en [00:00..00:00) artificial.
 *   3. Luego extraemos el YYYY-MM-DD del resultado ajustado y ese string es businessDay.
 *
 * Ejemplo (cutoff = 10):
 *   - LIMA_TZ_OFFSET = 5
 *   - shift = 10 + 5 = 15 horas
 *   - Marca local 2025-09-24 04:30 (UTC 2025-09-24 09:30Z)
 *       epochSecOriginal - 15h => cae en 2025-09-23 18:30Z => slice(0,10) => "2025-09-23"
 *     Esa salida tardía se agrupa con una ENTRADA del día anterior (hasta antes de cutoff 10:00).
 *
 * Ventajas:
 *   - No dependemos de APIs de time zone externas.
 *   - SQL en SQLite puede reproducir este mismo enfoque restando segundos.
 *
 * NOTA: Si algún día se cambia zona (DST o diferente offset) habría que migrar a una librería
 * (ej. luxon) y parametrizar offset dinámico.
 */

export const LIMA_TZ_OFFSET = 5; // Horas que se suman a UTC para llegar a hora local Lima (UTC-5)

/**
 * Devuelve el día de trabajo (YYYY-MM-DD) para una marca UTC dada (string ISO o Date).
 * @param isoOrDate  Fecha en ISO o instancia Date (UTC implícito)
 * @param cutoffHourLocal Hora local (0..23) que define el inicio del nuevo día de trabajo.
 */
export function computeBusinessDayFromUtc(isoOrDate: string | Date, cutoffHourLocal: number): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) throw new Error('Fecha inválida para computeBusinessDayFromUtc');
  const shiftHours = cutoffHourLocal + LIMA_TZ_OFFSET; // horas a restar para recentrar medianoche
  const epochSec = Math.floor(d.getTime() / 1000); // truncamos a segundos para estabilidad
  const adjustedMs = (epochSec - shiftHours * 3600) * 1000;
  const adjusted = new Date(adjustedMs);
  return adjusted.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Conveniencia: businessDay "ahora" según cutoff.
 */
export function nowBusinessDay(cutoffHourLocal: number): string {
  return computeBusinessDayFromUtc(new Date(), cutoffHourLocal);
}

/**
 * Lee el cutoff desde variables de entorno con fallback a 10.
 */
export function getConfiguredCutoffHour(): number {
  const raw = process.env.ATTENDANCE_CUTOFF_HOUR;
  const n = raw ? parseInt(raw, 10) : 10;
  if (Number.isNaN(n) || n < 0 || n > 23) return 10;
  return n;
}

/**
 * Helper directo para obtener el business day actual usando la configuración.
 */
export function currentBusinessDay(): string {
  return nowBusinessDay(getConfiguredCutoffHour());
}

// Pequeña auto-prueba opcional si se ejecuta directamente (node src/lib/attendanceDay.ts)
if (require.main === module) {
  const cutoff = getConfiguredCutoffHour();
  const samples = [
    '2025-09-23T21:05:00.000Z', // 16:05 local -> mismo día
    '2025-09-24T08:30:00.000Z', // 03:30 local -> día anterior
    '2025-09-24T15:59:59.000Z', // 10:59:59 local -> nuevo día
  ];
  for (const s of samples) {
    console.log(s, '=>', computeBusinessDayFromUtc(s, cutoff));
  }
}
