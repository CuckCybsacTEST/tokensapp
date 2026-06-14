const MUNDIAL2026_NAME_ALLOWED_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;

function stripNameAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function hasClearlyInvalidWord(word: string) {
  const lettersOnly = stripNameAccents(word).replace(/[^A-Za-z]/g, "");
  if (lettersOnly.length < 4) return false;
  return !/[AEIOUYaeiouy]/.test(lettersOnly);
}

export function normalizeMundial2026Name(value: string) {
  return stripNameAccents(value)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function getMundial2026NameValidationError(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < 3) {
    return "Ingresa un nombre recordable.";
  }

  if (!MUNDIAL2026_NAME_ALLOWED_REGEX.test(trimmed)) {
    return "Usa solo letras y espacios en tu nombre.";
  }

  const words = trimmed
    .split(" ")
    .map((word) => word.replace(/['-]+/g, ""))
    .filter(Boolean);

  if (words.length === 0 || words.some((word) => word.length < 2)) {
    return "Ingresa un nombre recordable.";
  }

  if (words.some(hasClearlyInvalidWord)) {
    return "Ingresa un nombre real.";
  }

  return null;
}