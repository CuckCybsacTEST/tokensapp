const DEFAULT_TERMS_VERSION = "birthday-referrer-v1";

export function normalizeReferrerDni(value: string) {
  return String(value || "").replace(/\D+/g, "").trim();
}

export function normalizeReferrerWhatsapp(value: string) {
  const digits = String(value || "").replace(/\D+/g, "").trim();
  if (digits.length === 11 && digits.startsWith("51")) {
    return digits.slice(2);
  }
  return digits;
}

export function normalizePersonName(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function isLikelyValidReferrerName(firstName: string, lastName: string) {
  const fullName = `${normalizePersonName(firstName)} ${normalizePersonName(lastName)}`.trim();
  if (!fullName) return false;
  if (fullName.split(" ").length < 2) return false;
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/.test(fullName)) return false;

  const words = fullName.split(" ").filter(Boolean);
  if (words.some((word) => word.length < 2)) return false;

  const collapsed = fullName.replace(/\s+/g, "").toLowerCase();
  if (/^(test|prueba|asdf|qwerty|nombre|apellido)+$/.test(collapsed)) return false;
  if (/^(.)\1{5,}$/.test(collapsed)) return false;

  return true;
}

export function slugifyReferrerName(value: string) {
  return normalizePersonName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function buildReferrerLink(baseUrl: string, slug: string) {
  return `${baseUrl.replace(/\/$/, "")}/reservatucumple/${encodeURIComponent(slug)}`;
}

export function nextTermsVersion() {
  return DEFAULT_TERMS_VERSION;
}
