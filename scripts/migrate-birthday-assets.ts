/**
 * Migration script to move birthday assets from qr-images bucket to dedicated buckets.
 * Run this once after deploying the code changes.
 */

import { config } from 'dotenv';
config({ path: '.env.local' }); // Load local env vars

import { createClient } from '@supabase/supabase-js';

// Use service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateBirthdayTemplates() {
  console.log('Migrating birthday-templates...');

  try {
    // List files in qr-images/birthday-templates/
    const { data: files, error: listError } = await supabase.storage
      .from('qr-images')
      .list('birthday-templates');

    if (listError) {
      console.error('Error listing birthday-templates:', listError);
      return;
    }

    for (const file of files || []) {
      if (file.name) {
        console.log(`Copying ${file.name}...`);

        // Download from old location
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('qr-images')
          .download(`birthday-templates/${file.name}`);

        if (downloadError) {
          console.error(`Error downloading ${file.name}:`, downloadError);
          continue;
        }

        // Upload to new bucket
        const { error: uploadError } = await supabase.storage
          .from('birthday-templates')
          .upload(file.name, fileData, {
            contentType: file.metadata?.mimetype || 'image/webp',
            upsert: true
          });

        if (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError);
        } else {
          console.log(`✅ Migrated ${file.name}`);
        }
      }
    }
  } catch (e) {
    console.error('Error migrating birthday-templates:', e);
  }
}

async function migrateBirthdayCards() {
  console.log('Migrating birthday-cards...');

  try {
    // List all files in qr-images/birthday-cards/ recursively
    const { data: files, error: listError } = await supabase.storage
      .from('qr-images')
      .list('birthday-cards', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error('Error listing birthday-cards:', listError);
      return;
    }

    // Process each reservation folder
    const reservationFolders = (files || []).filter(f => f.name && !f.name.includes('.'));
    for (const folder of reservationFolders) {
      console.log(`Processing reservation ${folder.name}...`);

      // List files in this reservation folder
      const { data: reservationFiles, error: resListError } = await supabase.storage
        .from('qr-images')
        .list(`birthday-cards/${folder.name}`);

      if (resListError) {
        console.error(`Error listing ${folder.name}:`, resListError);
        continue;
      }

      for (const file of reservationFiles || []) {
        if (file.name && file.name.endsWith('.png')) {
          const oldPath = `birthday-cards/${folder.name}/${file.name}`;
          const newPath = `${folder.name}/${file.name}`;

          console.log(`Copying ${oldPath}...`);

          // Download from old location
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('qr-images')
            .download(oldPath);

          if (downloadError) {
            console.error(`Error downloading ${oldPath}:`, downloadError);
            continue;
          }

          // Upload to new bucket
          const { error: uploadError } = await supabase.storage
            .from('birthday-cards')
            .upload(newPath, fileData, {
              contentType: 'image/png',
              upsert: true
            });

          if (uploadError) {
            console.error(`Error uploading ${newPath}:`, uploadError);
          } else {
            console.log(`✅ Migrated ${newPath}`);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error migrating birthday-cards:', e);
  }
}

async function main() {
  console.log('Starting birthday assets migration...');

  await migrateBirthdayTemplates();
  await migrateBirthdayCards();

  console.log('Migration completed. You can now remove the old folders from qr-images bucket.');
}

main().catch(console.error);