// splitLabelBackendV2.ts
// Algoritmo limpio para dividir etiquetas de ruleta en líneas, manteniendo el orden natural y conectores

export function splitLabelBackendV2(label: string): string[] {
  const clean = label.trim().replace(/\s+/g, ' ');
  if (clean.length <= 15) return [clean];

  // Detectar conectores y dividir en partes
  const connectorRegex = /\s+(\+|&|\*|\/|,)\s+/g;
  let match;
  let lastIndex = 0;
  let parts: string[] = [];
  let connectors: string[] = [];
  let result: string[] = [];

  // Extraer partes y conectores en orden
  while ((match = connectorRegex.exec(clean)) !== null) {
    parts.push(clean.slice(lastIndex, match.index).trim());
    connectors.push(match[1]);
    lastIndex = connectorRegex.lastIndex;
  }
  parts.push(clean.slice(lastIndex).trim());

  // Construir líneas: primera parte siempre arriba
  if (parts.length === 1) {
    // No hay conectores, dividir por longitud si es necesario
    if (parts[0].length > 22) {
      const words = parts[0].split(' ');
      const mid = Math.ceil(words.length / 2);
      return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
    return [parts[0]];
  }

  // Primera línea: parte principal
  result.push(parts[0]);
  // Siguientes líneas: conector + parte
  for (let i = 1; i < parts.length; i++) {
    let line = connectors[i - 1] + ' ' + parts[i];
    // Si la línea es muy larga, dividirla en dos manteniendo el conector
    if (line.length > 22) {
      const words = parts[i].split(' ');
      const mid = Math.ceil(words.length / 2);
      result.push(connectors[i - 1] + ' ' + words.slice(0, mid).join(' '));
      result.push(words.slice(mid).join(' '));
    } else {
      result.push(line);
    }
  }
  // Limitar a 3 líneas
  if (result.length > 3) result = [result[0], result[1], result.slice(2).join(' ')];
  return result.map(l => l.length > 22 ? l.slice(0, 21) + '…' : l);
}
