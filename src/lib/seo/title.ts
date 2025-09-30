// Helper to compose page titles (brand is applied globally via root metadata template)
interface BuildTitleOptions { maxLength?: number; separator?: string; }
export function buildTitle(parts: string | Array<string | null | undefined>, opts: BuildTitleOptions = {}) {
  const { maxLength = 120, separator = ' · ' } = opts;
  const arr = Array.isArray(parts) ? parts : [parts];
  const cleaned = arr.map(p => (p || '').trim()).filter(Boolean);
  const base = cleaned.join(separator);
  if (!base) return '';
  return base.length <= maxLength ? base : base.slice(0, maxLength - 1) + '…';
}
export function brandTitle(section?: string) { return buildTitle(section ? [section] : []); }
