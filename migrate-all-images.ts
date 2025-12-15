// Script completo para migrar todas las imágenes locales a Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: '.env.local' });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno faltantes:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapeo de carpetas locales a buckets de Supabase
const MIGRATION_MAP = {
  // Plantillas de cumpleaños (prioridad alta)
  'public/birthdays/templates/': 'birthday-templates/',

  // Imágenes de ofertas
  'public/offers/': 'offers/',

  // Imágenes de shows
  'public/shows/': 'show-images/',

  // Posters y premios
  'public/posters/': 'posters/',
  'public/prizes/': 'prizes/',

  // Videos (opcional - son grandes)
  // 'public/videos/': 'videos/',
} as const;

async function uploadFile(localPath: string, supabasePath: string): Promise<void> {
  try {
    console.log(`📤 Subiendo: ${localPath} → ${supabasePath}`);

    const buffer = await fs.readFile(localPath);
    const contentType = getContentType(localPath);

    const { data, error } = await supabase.storage
      .from('qr-images') // Bucket existente para imágenes
      .upload(supabasePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error(`❌ Error subiendo ${localPath}:`, error);
    } else {
      console.log(`✅ Subido: ${supabasePath}`);

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('qr-images')
        .getPublicUrl(supabasePath);

      console.log(`🔗 URL: ${urlData.publicUrl}`);
    }
  } catch (error) {
    console.error(`❌ Error procesando ${localPath}:`, error);
  }
}

async function getAllFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  async function scanDir(currentPath: string): Promise<void> {
    const items = await fs.readdir(currentPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(currentPath, item.name);

      if (item.isDirectory()) {
        await scanDir(fullPath);
      } else if (item.isFile()) {
        files.push(fullPath);
      }
    }
  }

  try {
    await scanDir(dirPath);
  } catch (error) {
    // Directorio no existe, retornar array vacío
    console.log(`⚠️ Directorio no encontrado: ${dirPath}`);
  }

  return files;
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
  };
  return types[ext] || 'application/octet-stream';
}

async function migrateAll(): Promise<void> {
  console.log('🚀 Iniciando migración completa de imágenes a Supabase...\n');

  for (const [localDir, supabaseDir] of Object.entries(MIGRATION_MAP)) {
    console.log(`\n📁 Migrando ${localDir} → ${supabaseDir}`);

    try {
      // Encontrar todos los archivos en el directorio local
      const files = await getAllFiles(localDir);

      if (files.length === 0) {
        console.log(`⚠️ No se encontraron archivos en ${localDir}`);
        continue;
      }

      console.log(`📊 Encontrados ${files.length} archivos`);

      for (const filePath of files) {
        // Crear la ruta de Supabase manteniendo la estructura relativa
        const relativePath = path.relative(localDir, filePath);
        const supabasePath = path.join(supabaseDir, relativePath).replace(/\\/g, '/');

        await uploadFile(filePath, supabasePath);
      }

    } catch (error) {
      console.error(`❌ Error procesando directorio ${localDir}:`, error);
    }
  }

  console.log('\n🎉 Migración completada!');
  console.log('\n📋 Resumen de carpetas creadas en Supabase:');
  Object.entries(MIGRATION_MAP).forEach(([local, supabase]) => {
    console.log(`  • ${supabase} (desde ${local})`);
  });
}

// Ejecutar migración
migrateAll().catch(console.error);