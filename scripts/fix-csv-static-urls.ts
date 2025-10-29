#!/usr/bin/env tsx
/*
Script para corregir URLs en CSVs existentes de batches estáticos.

Este script busca CSVs de tokens en las carpetas temporales y corrige las URLs
de redención para que usen /static/ en lugar de /r/ cuando el batch es estático.
*/
import fs from 'fs';
import path from 'path';
import { logInfo, logWarn, logError } from '../src/lib/stdout';
import { prisma } from '../src/lib/prisma';

async function fixCsvUrls(csvPath: string, batchId: string): Promise<boolean> {
  try {
    // Check if batch is static
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { staticTargetUrl: true }
    });

    if (!batch?.staticTargetUrl) {
      logInfo('csv_fix_skip', `Batch ${batchId} is not static, skipping`);
      return false;
    }

    // Read CSV
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split(/\r?\n/).filter(Boolean);

    if (lines.length < 2) {
      logWarn('csv_fix_empty', `CSV ${csvPath} is empty or invalid`);
      return false;
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    const idxUrl = header.indexOf('redeem_url');

    if (idxUrl === -1) {
      logWarn('csv_fix_no_url_column', `CSV ${csvPath} doesn't have redeem_url column`);
      return false;
    }

    // Check if URLs need fixing
    let needsFixing = false;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols[idxUrl] && cols[idxUrl].includes('/r/')) {
        needsFixing = true;
        break;
      }
    }

    if (!needsFixing) {
      logInfo('csv_fix_no_changes', `CSV ${csvPath} already has correct URLs`);
      return false;
    }

    // Fix URLs
    const fixedLines = [lines[0]]; // Keep header
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols[idxUrl]) {
        cols[idxUrl] = cols[idxUrl].replace(/\/r\//g, '/static/');
      }
      fixedLines.push(cols.join(','));
    }

    // Write back
    fs.writeFileSync(csvPath, fixedLines.join('\n'));
    logInfo('csv_fix_success', `Fixed URLs in ${csvPath} for static batch ${batchId}`);
    return true;

  } catch (error) {
    logError('csv_fix_error', `Failed to fix CSV ${csvPath}: ${error}`);
    return false;
  }
}

async function main() {
  logInfo('csv_fix_start', 'Starting CSV URL correction for static batches');

  // Find all CSV files in temp directories
  const candidates = [
    path.resolve(process.cwd(), 'tmp'),
    path.resolve(process.cwd(), 'storage', 'batches'),
  ];

  let fixedCount = 0;
  let totalCount = 0;

  for (const baseDir of candidates) {
    if (!fs.existsSync(baseDir)) continue;

    // Find all subdirectories that might contain batch CSVs
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirPath = path.join(baseDir, entry.name);
      const csvPath = path.join(dirPath, 'tokens.csv');

      if (fs.existsSync(csvPath)) {
        // Extract batch ID from directory name
        let batchId = entry.name;
        if (batchId.startsWith('batch_')) {
          batchId = batchId.substring(6);
        }

        totalCount++;
        if (await fixCsvUrls(csvPath, batchId)) {
          fixedCount++;
        }
      }
    }
  }

  logInfo('csv_fix_complete', `Processed ${totalCount} CSVs, fixed ${fixedCount}`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});