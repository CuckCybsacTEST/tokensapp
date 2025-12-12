#!/usr/bin/env node

/**
 * Script para inicializar Supabase Storage bucket para imágenes QR
 * Ejecutar después de configurar las variables de entorno de Supabase
 *
 * Uso: node scripts/setup-supabase-storage.js
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  console.log('Configura estas variables antes de ejecutar el script:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  console.log('')
  console.log('Ejemplo:')
  console.log('export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"')
  console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET_NAME = 'qr-images'

async function setupSupabaseStorage() {
  try {
    console.log('🚀 Inicializando Supabase Storage...')

    // Verificar si el bucket ya existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Error listando buckets:', listError)
      return
    }

    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME)

    if (bucketExists) {
      console.log(`✅ Bucket '${BUCKET_NAME}' ya existe`)
    } else {
      // Crear el bucket
      const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // Hacer público para acceso directo a imágenes
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 20971520 // 20MB
      })

      if (error) {
        console.error('❌ Error creando bucket:', error)
        return
      }

      console.log(`✅ Bucket '${BUCKET_NAME}' creado exitosamente`)
    }

    // Crear carpetas virtuales (policy)
    console.log('📁 Configurando políticas de acceso...')

    // Política para permitir uploads públicos (desde el cliente)
    const { error: policyError } = await supabase.storage.from(BUCKET_NAME).createSignedUploadUrl('temp-file', {
      upsert: false
    })

    // Nota: Las políticas se configuran en el dashboard de Supabase
    console.log('⚠️  Importante: Configura estas políticas en el dashboard de Supabase:')
    console.log('1. Storage → Buckets → qr-images → Policies')
    console.log('2. Agrega política para INSERT/SELECT en carpetas original/, optimized/')
    console.log('3. Permite acceso público para SELECT en todas las imágenes')

    console.log('🎉 Setup completado!')
    console.log(`📦 Bucket: ${BUCKET_NAME}`)
    console.log(`🌐 URL pública: https://${supabaseUrl.split('//')[1]}/storage/v1/object/public/${BUCKET_NAME}/`)

  } catch (error) {
    console.error('❌ Error en setup:', error)
  }
}

setupSupabaseStorage()