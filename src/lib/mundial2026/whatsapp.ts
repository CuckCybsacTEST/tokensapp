const NON_DIGIT_RE = /\D+/g;

export function normalizeMundial2026WhatsApp(input: string): string | null {
  let digits = String(input || "").replace(NON_DIGIT_RE, "").trim();
  if (!digits) return null;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 9) {
    digits = `51${digits}`;
  }

  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

export function maskMundial2026WhatsApp(value: string): string {
  const normalized = normalizeMundial2026WhatsApp(value);
  if (!normalized) return value;
  if (normalized.length <= 4) return normalized;
  return `${normalized.slice(0, 3)}***${normalized.slice(-3)}`;
}