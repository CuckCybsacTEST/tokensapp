/** Shared Lima-time date formatters for the invitations module. */

const LIMA_OFFSET_MS = 5 * 3600 * 1000;

/** Returns "YYYY-MM-DD" in Lima time */
export function fmtLimaDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const lima = new Date(d.getTime() - LIMA_OFFSET_MS);
    const y = lima.getUTCFullYear();
    const m = String(lima.getUTCMonth() + 1).padStart(2, '0');
    const day = String(lima.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch { return ''; }
}

/** Returns "YYYY-MM-DD HH:MM" in Lima time */
export function fmtLimaDateTime(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const lima = new Date(d.getTime() - LIMA_OFFSET_MS);
    const y = lima.getUTCFullYear();
    const m = String(lima.getUTCMonth() + 1).padStart(2, '0');
    const day = String(lima.getUTCDate()).padStart(2, '0');
    const hh = String(lima.getUTCHours()).padStart(2, '0');
    const mm = String(lima.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch { return ''; }
}

const MONTHS_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/** Returns "7 May 2024" (abbreviated month) in Lima time */
export function fmtLimaDateShort(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const lima = new Date(d.getTime() - LIMA_OFFSET_MS);
    return `${lima.getUTCDate()} ${MONTHS_ABBR[lima.getUTCMonth()]} ${lima.getUTCFullYear()}`;
  } catch { return ''; }
}

/** Returns "7 de Mayo 2024" (full month) in Lima time */
export function fmtLimaDateLong(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const lima = new Date(d.getTime() - LIMA_OFFSET_MS);
    return `${lima.getUTCDate()} de ${MONTHS_FULL[lima.getUTCMonth()]} ${lima.getUTCFullYear()}`;
  } catch { return ''; }
}
