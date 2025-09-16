// Color utilities
// Normaliza un color a formato #RRGGBB (hex). Acepta:
//  - "#abc" / "abc" -> "#AABBCC"
//  - "#aabbcc" / "aabbcc" -> "#AABBCC"
// Retorna null si inválido.
export function normalizeHexColor(input: string): string | null {
  if (!input) return null;
  let c = input.trim();
  if (c.startsWith("#")) c = c.slice(1);
  if (c.length === 3) {
    if (!/^[0-9a-fA-F]{3}$/.test(c)) return null;
    c = c
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (c.length === 6 && /^[0-9a-fA-F]{6}$/.test(c)) {
    return "#" + c.toUpperCase();
  }
  return null;
}
