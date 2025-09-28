/**
 * Script de guardia CI: falla si encuentra patrones legacy de errores.
 * Busca expresiones: NextResponse.json({ error:  o JSON.stringify({ error:
 * Excluye middleware (ya migrado a edgeApiError) y node_modules.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const TARGET_DIR = join(root, 'src');
const legacyPatterns = [
  'NextResponse.json({ error:',
  'JSON.stringify({ error:'
];
const allowListFiles = new Set<string>([ // archivos permitidos temporalmente (vacío ahora)
]);

function walk(dir: string, acc: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc); else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const offenders: { file: string; pattern: string; line: number; snippet: string }[] = [];
for (const file of walk(TARGET_DIR)) {
  const rel = file.replace(root + '/', '');
  if (allowListFiles.has(rel)) continue;
  const content = readFileSync(file, 'utf8');
  legacyPatterns.forEach(pattern => {
    let idx = content.indexOf(pattern);
    while (idx !== -1) {
      const pre = content.slice(0, idx).split(/\n/).length;
      // Evitar falsos positivos donde el patrón se usa en comentario indicando migración (heurística simple)
      const lineText = content.split(/\n/)[pre - 1].trim();
      if (!/migrad|migrar|TODO:.*migrar/i.test(lineText)) {
        offenders.push({ file: rel, pattern, line: pre, snippet: lineText });
      }
      idx = content.indexOf(pattern, idx + pattern.length);
    }
  });
}

if (offenders.length) {
  console.error('\n❌ Detectados patrones legacy de error:');
  for (const o of offenders) {
    console.error(` - ${o.file}:${o.line} => ${o.pattern} :: ${o.snippet}`);
  }
  console.error('\nSolución: reemplaza por apiError()/edgeApiError().');
  process.exit(1);
} else {
  console.log('✅ Sin patrones legacy de errores.');
}
