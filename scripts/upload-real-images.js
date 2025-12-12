#!/usr/bin/env node

/**
 * Script para subir imágenes reales a Supabase para tokens específicos
 * Actualiza las URLs en la base de datos para que apunten a Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const prisma = new PrismaClient();

// Configuración
const BUCKET_NAME = 'qr-images';
const IMAGES_DIR = path.join(__dirname, '..', 'temp-images'); // Carpeta donde el usuario debe colocar las imágenes

// Tokens específicos a actualizar
const TARGET_TOKENS = [
  'C1ED7C2BDD9C9CEE7C1289EDD571FFFE',
  '56DA118D2FDD92FFF10F9C9D7EF06094',
  'BD11A22C7C079BB3C00BB8F091C92D54',
  'B2A85941ABA935800B03BDACA2890C8A'
];

async function processImage(imagePath, outputPath, isOptimized = false) {
  try {
    if (isOptimized) {
      // Optimizar imagen: convertir a WebP, redimensionar si es necesario
      await sharp(imagePath)
        .webp({ quality: 85 })
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .toFile(outputPath);
    } else {
      // Mantener imagen original pero convertir a JPEG si no lo es
      const ext = path.extname(imagePath).toLowerCase();
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        // Copiar sin conversión
        fs.copyFileSync(imagePath, outputPath);
      } else {
        // Convertir a JPEG
        await sharp(imagePath)
          .jpeg({ quality: 95 })
          .toFile(outputPath.replace(path.extname(outputPath), '.jpg'));
      }
    }
  } catch (error) {
    console.error(`❌ Error procesando imagen ${imagePath}:`, error.message);
    throw error;
  }
}

async function uploadToSupabase(localPath, supabasePath) {
  try {
    console.log(`📤 Subiendo: ${supabasePath}`);

    const fileBuffer = fs.readFileSync(localPath);
    const contentType = getContentType(localPath);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(supabasePath, fileBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error(`❌ Error subiendo ${supabasePath}:`, error.message);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(supabasePath);

    console.log(`✅ Subido exitosamente: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error(`❌ Error procesando ${localPath}:`, error.message);
    return null;
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

async function processTokenImages(tokenCode) {
  console.log(`\n🔄 Procesando imágenes para token: ${tokenCode}`);

  // Buscar el token en la base de datos
  const token = await prisma.customQr.findUnique({
    where: { code: tokenCode },
    select: { id: true, code: true, customerName: true }
  });

  if (!token) {
    console.log(`❌ Token ${tokenCode} no encontrado en la base de datos`);
    return false;
  }

  console.log(`👤 Cliente: ${token.customerName}`);

  // Buscar archivos de imagen para este token
  const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  let imageFile = null;

  for (const ext of possibleExtensions) {
    const testPath = path.join(IMAGES_DIR, `${tokenCode}${ext}`);
    if (fs.existsSync(testPath)) {
      imageFile = testPath;
      break;
    }
  }

  if (!imageFile) {
    console.log(`⚠️ No se encontró imagen para token ${tokenCode} en ${IMAGES_DIR}`);
    console.log(`   Archivos esperados: ${tokenCode}.jpg, ${tokenCode}.jpeg, ${tokenCode}.png, ${tokenCode}.webp`);
    return false;
  }

  console.log(`📁 Imagen encontrada: ${path.basename(imageFile)}`);

  // Crear directorio temporal para procesar imágenes
  const tempDir = path.join(__dirname, '..', 'temp-processed');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const timestamp = Date.now();
  const hash = Math.random().toString(36).substring(2, 18);
  const baseName = `${timestamp}-${hash}`;

  // Procesar imagen original
  const originalTempPath = path.join(tempDir, `${baseName}-original.jpg`);
  await processImage(imageFile, originalTempPath, false);

  // Procesar imagen optimizada
  const optimizedTempPath = path.join(tempDir, `${baseName}-optimized.webp`);
  await processImage(imageFile, optimizedTempPath, true);

  // Subir a Supabase
  const originalSupabasePath = `original/${baseName}.jpg`;
  const optimizedSupabasePath = `optimized/${baseName}.webp`;

  const originalUrl = await uploadToSupabase(originalTempPath, originalSupabasePath);
  const optimizedUrl = await uploadToSupabase(optimizedTempPath, optimizedSupabasePath);

  if (!originalUrl || !optimizedUrl) {
    console.log(`❌ Error subiendo imágenes para token ${tokenCode}`);
    return false;
  }

  // Actualizar base de datos
  await prisma.customQr.update({
    where: { code: tokenCode },
    data: {
      imageUrl: optimizedUrl,
      originalImageUrl: originalUrl,
      imageMetadata: JSON.stringify({
        uploadedAt: new Date().toISOString(),
        originalFilename: path.basename(imageFile),
        processed: true
      })
    }
  });

  console.log(`✅ Token ${tokenCode} actualizado exitosamente`);
  console.log(`   URL optimizada: ${optimizedUrl}`);
  console.log(`   URL original: ${originalUrl}`);

  // Limpiar archivos temporales
  try {
    fs.unlinkSync(originalTempPath);
    fs.unlinkSync(optimizedTempPath);
  } catch (error) {
    console.warn(`⚠️ No se pudieron eliminar archivos temporales: ${error.message}`);
  }

  return true;
}

async function main() {
  console.log('🚀 Iniciando subida de imágenes reales para tokens específicos\n');

  // Verificar que existe el directorio de imágenes
  if (!fs.existsSync(IMAGES_DIR)) {
    console.log(`❌ Directorio de imágenes no encontrado: ${IMAGES_DIR}`);
    console.log('📁 Crea este directorio y coloca las imágenes con nombres como:');
    TARGET_TOKENS.forEach(code => {
      console.log(`   - ${code}.jpg (o .png, .jpeg, .webp)`);
    });
    process.exit(1);
  }

  console.log(`📁 Buscando imágenes en: ${IMAGES_DIR}`);
  console.log(`🎯 Tokens a procesar: ${TARGET_TOKENS.length}`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (const tokenCode of TARGET_TOKENS) {
    try {
      const success = await processTokenImages(tokenCode);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Error procesando token ${tokenCode}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n🎉 Proceso completado!`);
  console.log(`✅ Tokens actualizados: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);

  if (successCount > 0) {
    console.log('\n🔗 Las imágenes ahora están disponibles en Supabase y se mostrarán en el frontend.');
    console.log('💡 Reinicia el servidor de desarrollo si es necesario para ver los cambios.');
  }

  // Limpiar directorio temporal
  const tempDir = path.join(__dirname, '..', 'temp-processed');
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(`⚠️ No se pudo limpiar directorio temporal: ${error.message}`);
  }
}

if (require.main === module) {
  main().catch(console.error).finally(() => {
    prisma.$disconnect();
  });
}

module.exports = { processTokenImages };