// Structured stdout logging
// logJson(level,event,message?,extra?)
export function logJson(level: string, event: string, message?: string, extra?: any) {
  const rec: any = {
    level,
    time: new Date().toISOString(),
    event,
  };
  if (message) rec.message = message;
  if (extra !== undefined) rec.extra = sanitize(extra);
  // Use process.stdout.write to avoid newline duplication concerns
  process.stdout.write(JSON.stringify(rec) + "\n");
}

function sanitize(v: any): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(sanitize);
  if (typeof v === "object") {
    const out: any = {};
    for (const k of Object.keys(v)) {
      const val = (v as any)[k];
      if (val instanceof Date) out[k] = val.toISOString();
      else out[k] = sanitize(val);
    }
    return out;
  }
  return v;
}

export const logInfo = (event: string, message?: string, extra?: any) =>
  logJson("info", event, message, extra);
export const logWarn = (event: string, message?: string, extra?: any) =>
  logJson("warn", event, message, extra);
export const logError = (event: string, message?: string, extra?: any) =>
  logJson("error", event, message, extra);
