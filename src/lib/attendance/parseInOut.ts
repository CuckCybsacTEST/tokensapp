export interface ParseResult {
  mode: 'IN' | 'OUT' | null;
  source?: string;
}

// Centralized parser for attendance IN/OUT codes.
// Accepts plain text (IN / OUT), JSON {kind:'GLOBAL', mode}, base64url(JSON), URL with ?mode=, and
// prefixed text starting with GLOBAL containing IN or OUT. Fallback used for ambiguous cases.
export function parseInOut(rawInput: string, fallbackMode: 'IN'|'OUT' = 'IN'): ParseResult {
  if(!rawInput) return { mode: null };
  const raw = rawInput.trim();
  const upper = raw.toUpperCase();
  if(upper === 'IN' || upper === 'OUT') return { mode: upper as 'IN'|'OUT', source: 'PLAIN' };
  // JSON direct
  try {
    const j = JSON.parse(raw);
    if(j && typeof j === 'object' && j.kind === 'GLOBAL' && (j.mode === 'IN' || j.mode === 'OUT')){
      return { mode: j.mode, source: 'JSON' };
    }
  } catch {}
  // base64url JSON
  try {
    const pad = raw.length % 4 === 2 ? '==' : raw.length % 4 === 3 ? '=' : '';
    const b64 = raw.replace(/-/g,'+').replace(/_/g,'/')+pad;
    const dec = atob(b64);
    const j2 = JSON.parse(dec);
    if(j2 && j2.kind === 'GLOBAL' && (j2.mode === 'IN' || j2.mode === 'OUT')){
      return { mode: j2.mode, source: 'B64JSON' };
    }
  } catch {}
  // URL with query param
  try {
    const u = new URL(raw);
    const m = (u.searchParams.get('mode')||'').toUpperCase();
    if(m === 'IN' || m === 'OUT') return { mode: m as 'IN'|'OUT', source: 'URL' };
  } catch {}
  // GLOBAL prefixed text containing IN/OUT
  if(upper.startsWith('GLOBAL') && (upper.includes('IN') || upper.includes('OUT'))){
    if(upper.includes('IN') && !upper.includes('OUT')) return { mode: 'IN', source: 'GLOBAL_TEXT' };
    if(upper.includes('OUT') && !upper.includes('IN')) return { mode: 'OUT', source: 'GLOBAL_TEXT' };
    return { mode: fallbackMode, source: 'GLOBAL_AMBIGUOUS' };
  }
  return { mode: null };
}
