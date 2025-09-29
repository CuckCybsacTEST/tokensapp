export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { apiOk } from '@/lib/apiError';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Escaneo simple (runtime build) – no ideal para edge pero suficiente para diagnóstico.
// Produce lista única de codes apareciendo como apiError('CODE' ...) o edgeApiError('CODE').

function scanCodes(): string[] {
  const root = process.cwd();
  const srcDir = join(root, 'src');
  const files: string[] = [];
  const out = new Set<string>();
  function walk(dir: string) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) walk(full); else if (/\.(ts|tsx|js|mjs)$/.test(ent.name)) files.push(full);
    }
  }
  walk(srcDir);
  const reApi = /apiError\(\s*['\"]([A-Z0-9_]+)['\"]/g;
  const reEdge = /edgeApiError\(\s*['\"]([A-Z0-9_]+)['\"]/g;
  for (const f of files) {
    let text: string;
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    let m: RegExpExecArray | null;
    while ((m = reApi.exec(text))) out.add(m[1]);
    while ((m = reEdge.exec(text))) out.add(m[1]);
  }
  return Array.from(out).sort();
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const codes = scanCodes();
  return apiOk({ codes, count: codes.length, generatedAt: new Date().toISOString() });
}
