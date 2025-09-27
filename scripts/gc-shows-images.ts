#!/usr/bin/env tsx
/*
Garbage collector de imágenes de shows.

Acciones:
 1. Escanea public/shows para listar archivos (webp, jpg, jpeg, png) y cualquier otro.
 2. Construye set de rutas referenciadas: Show.imageOriginalPath + Show.imageWebpPath (nombres base, sin directorio).
 3. Identifica huérfanos (en disco pero no referenciados en DB).
 4. Sólo considera para mover a .trash aquellos con mtime > 10 minutos (gracia por cargas concurrentes).
 5. Mueve huérfanos elegibles a public/shows/.trash (conservando nombre) – si colisión, añade sufijo timestamp.
 6. Purga definitivos dentro de .trash con mtime > 24h (elimina).
 7. Imprime resumen de conteos: totalFiles, referenced, orphanCandidates, moved, trashedRemaining, purged.

Criterios: En entorno dev no borra activos referenciados; logs estructurados y resumen legible.

Uso:
  tsx scripts/gc-shows-images.ts [--dry-run]

--dry-run: No mueve ni borra, sólo reporta.
*/
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';
import { logInfo, logWarn } from '../src/lib/stdout';

interface Args { dryRun: boolean }
function parseArgs(): Args {
  const a = process.argv.slice(2);
  return { dryRun: a.includes('--dry-run') };
}

const SHOWS_DIR = path.join(process.cwd(), 'public', 'shows');
const TRASH_DIR = path.join(SHOWS_DIR, '.trash');
const GRACE_MS = 10 * 60 * 1000; // 10m
const PURGE_MS = 24 * 60 * 60 * 1000; // 24h

async function ensureDir(p: string) { await fs.mkdir(p, { recursive: true }).catch(()=>{}); }

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string, rel: string) {
    const ents = await fs.readdir(current, { withFileTypes: true });
    for (const e of ents) {
      const abs = path.join(current, e.name);
      const r = path.join(rel, e.name);
      if (e.isDirectory()) {
        if (e.name === '.trash') continue; // skip traversal into trash for main listing
        await walk(abs, r);
      } else {
        out.push(r.replace(/\\/g,'/'));
      }
    }
  }
  try { await walk(dir, ''); } catch (e) { logWarn('shows_gc_scan_error', 'Scan failed', { error: String(e) }); }
  return out;
}

async function main() {
  const { dryRun } = parseArgs();
  await ensureDir(SHOWS_DIR);
  await ensureDir(TRASH_DIR);

  // Load referenced filenames
  const shows = await prisma.show.findMany({ select: { imageOriginalPath:true, imageWebpPath:true } });
  const referenced = new Set<string>();
  for (const s of shows) {
    if (s.imageOriginalPath) referenced.add(s.imageOriginalPath);
    if (s.imageWebpPath) referenced.add(s.imageWebpPath);
  }

  const files = await listFiles(SHOWS_DIR); // relative to SHOWS_DIR (no .trash contents)
  const now = Date.now();
  const orphanCandidates: string[] = [];

  // Build file stats
  for (const rel of files) {
    const base = path.basename(rel);
    if (referenced.has(base)) continue; // in use
    // Only consider immediate files inside shows/ (ignore nested subdirs if any except .trash which we skipped)
    const abs = path.join(SHOWS_DIR, rel);
    try {
      const st = await fs.stat(abs);
      const age = now - st.mtime.getTime();
      if (age > GRACE_MS) {
        orphanCandidates.push(rel);
      }
    } catch (e) {
      logWarn('shows_gc_stat_fail', 'Stat failed', { file: rel, error: String(e) });
    }
  }

  // Move orphans to trash
  let moved = 0;
  if (!dryRun) {
    for (const rel of orphanCandidates) {
      const base = path.basename(rel);
      const src = path.join(SHOWS_DIR, rel);
      let dest = path.join(TRASH_DIR, base);
      // Collision handling
      try {
        await fs.access(dest);
        const ext = path.extname(base);
        const nameNoExt = base.slice(0, base.length - ext.length);
        dest = path.join(TRASH_DIR, `${nameNoExt}-${Date.now()}${ext}`);
      } catch { /* no collision */ }
      try {
        await fs.rename(src, dest);
        moved++;
      } catch (e) {
        logWarn('shows_gc_move_fail', 'Move failed', { file: rel, error: String(e) });
      }
    }
  }

  // Purge old trash
  let purged = 0; let trashRemaining = 0;
  try {
    const trashEntries = await fs.readdir(TRASH_DIR, { withFileTypes: true });
    for (const e of trashEntries) {
      if (!e.isFile()) continue;
      const abs = path.join(TRASH_DIR, e.name);
      try {
        const st = await fs.stat(abs);
        const age = now - st.mtime.getTime();
        if (age > PURGE_MS) {
          if (!dryRun) {
            await fs.unlink(abs).catch(()=>{});
            purged++;
          } else {
            trashRemaining++; // still counted as remaining for dry-run
          }
        } else {
          trashRemaining++;
        }
      } catch (err) {
        logWarn('shows_gc_trash_stat_fail', 'Trash stat failed', { file: e.name, error: String(err) });
      }
    }
  } catch (e) {
    logWarn('shows_gc_trash_list_fail', 'List trash failed', { error: String(e) });
  }

  const summary = {
    totalFiles: files.length,
    referenced: referenced.size,
    orphanCandidates: orphanCandidates.length,
    moved,
    trashRemaining,
    purged,
    dryRun,
  };
  logInfo('shows_gc_summary', undefined, summary);
  console.log(`[shows-gc] total=${files.length} referenced=${referenced.size} orphans=${orphanCandidates.length} moved=${moved} trashRemaining=${trashRemaining} purged=${purged} dryRun=${dryRun}`);

  await prisma.$disconnect();
}

main().catch(e => {
  logWarn('shows_gc_error', 'Unhandled error', { error: String(e) });
  console.error(e);
  process.exit(1);
});
