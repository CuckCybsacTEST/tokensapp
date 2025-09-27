export const MONTHS_ES = [
  'enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'
];

const MONTH_ALIASES: Record<string, number> = {
  ene:1, enero:1,
  feb:2, febrero:2,
  mar:3, marzo:3,
  abr:4, abril:4,
  may:5, mayo:5,
  jun:6, junio:6,
  jul:7, julio:7,
  ago:8, agosto:8,
  sep:9, sept:9, septi:9, set:9, setiembre:9, septiembre:9,
  oct:10, octubre:10,
  nov:11, noviembre:11,
  dic:12, diciembre:12
};

export function parseBirthdayInput(raw: string): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  let iso = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    iso = trimmed;
  } else if (/^\d{2}-\d{2}$/.test(trimmed)) {
    iso = `2000-${trimmed}`;
  } else {
    const norm = trimmed.toLowerCase().replace(/\s+/g,' ');
    const m = norm.match(/^(\d{1,2})\s+([a-záéíóúüñ\.]{3,20})$/i);
    if (m) {
      const day = parseInt(m[1],10);
      const token = m[2].replace(/\.$/,'');
      const month = MONTH_ALIASES[token];
      if (!month || day < 1 || day > 31) return null;
      iso = `2000-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    } else return null;
  }
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  const [yyyy, mm, dd] = iso.split('-');
  if (d.getUTCMonth()+1 !== Number(mm) || d.getUTCDate() !== Number(dd)) return null;
  return d;
}

export function formatBirthdayLabel(date: Date | null | undefined): string | null {
  if (!date) return null;
  try {
    const monthName = MONTHS_ES[date.getUTCMonth()] || '';
    const day = date.getUTCDate();
    if (!monthName) return null;
    return `${day} ${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}`;
  } catch { return null; }
}

export function buildBirthdaySubmission(day: string, monthNumber: string): string {
  const d = String(parseInt(day,10));
  const idx = parseInt(monthNumber,10)-1;
  if (idx < 0 || idx >= MONTHS_ES.length) return d;
  const name = MONTHS_ES[idx];
  return `${d} ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}
