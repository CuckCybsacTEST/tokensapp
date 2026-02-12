#!/usr/bin/env tsx
/*
Script para eliminar todas las imágenes de QR personalizados de Supabase Storage.

Elimina todas las imágenes de las carpetas 'original' y 'optimized' en el bucket 'qr-images'.

Uso:
  tsx scripts/purge-qr-images.ts [--dry-run]

--dry-run: No elimina, solo lista las imágenes que serían eliminadas.
*/

// Load environment variables FIRST, before any imports
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

// Debug: Check if Supabase vars are loaded
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗');
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓' : '✗');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');

// Now import after env vars are loaded
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = 'qr-images';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface Args {
  dryRun: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run')
  };
}

async function listFiles(folder: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list(folder);

    if (error) {
      console.error(`Error listing files in ${folder}:`, error);
      return [];
    }

    return data?.map(file => file.name) || [];
  } catch (error) {
    console.error(`Error listing files in ${folder}:`, error);
    return [];
  }
}

async function deleteFiles(folder: string, fileNames: string[]): Promise<number> {
  if (fileNames.length === 0) return 0;

  const BATCH_SIZE = 10; // Eliminar en lotes de 10 para evitar límites de API
  let deletedCount = 0;

  for (let i = 0; i < fileNames.length; i += BATCH_SIZE) {
    const batch = fileNames.slice(i, i + BATCH_SIZE);
    const filePaths = batch.map(name => `${folder}/${name}`);

    try {
      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove(filePaths);

      if (error) {
        console.error(`Error deleting batch ${Math.floor(i / BATCH_SIZE) + 1} from ${folder}:`, error);
        continue; // Continuar con el siguiente lote
      }

      deletedCount += batch.length;
      console.log(`  - Deleted ${batch.length} files from ${folder} (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
    } catch (error) {
      console.error(`Error deleting batch ${Math.floor(i / BATCH_SIZE) + 1} from ${folder}:`, error);
      continue; // Continuar con el siguiente lote
    }
  }

  return deletedCount;
}

async function main() {
  const { dryRun } = parseArgs();

  console.log(`${dryRun ? '[DRY RUN]' : '[LIVE]'} Purging QR images from Supabase Storage`);
  console.log('Bucket:', STORAGE_BUCKET);

  // List files in both folders
  console.log('\nListing files...');

  const [originalFiles, optimizedFiles] = await Promise.all([
    listFiles('original'),
    listFiles('optimized')
  ]);

  console.log(`Found ${originalFiles.length} files in 'original' folder`);
  console.log(`Found ${optimizedFiles.length} files in 'optimized' folder`);

  const totalFiles = originalFiles.length + optimizedFiles.length;

  if (totalFiles === 0) {
    console.log('No files to delete.');
    return;
  }

  if (dryRun) {
    console.log('\nFiles that would be deleted:');
    console.log('\nOriginal folder:');
    originalFiles.forEach(file => console.log(`  - ${file}`));
    console.log('\nOptimized folder:');
    optimizedFiles.forEach(file => console.log(`  - ${file}`));
    console.log(`\nTotal: ${totalFiles} files`);
    return;
  }

  // Delete files
  console.log('\nDeleting files...');

  const [deletedOriginal, deletedOptimized] = await Promise.all([
    deleteFiles('original', originalFiles),
    deleteFiles('optimized', optimizedFiles)
  ]);

  const totalDeleted = deletedOriginal + deletedOptimized;

  console.log('\nDeletion complete:');
  console.log(`- Original folder: ${deletedOriginal} files deleted`);
  console.log(`- Optimized folder: ${deletedOptimized} files deleted`);
  console.log(`- Total: ${totalDeleted} files deleted`);

  if (totalDeleted !== totalFiles) {
    console.warn(`Warning: Expected to delete ${totalFiles} files, but only deleted ${totalDeleted}`);
  }
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});