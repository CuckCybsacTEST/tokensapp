#!/usr/bin/env node

/**
 * Test básico de la integración de Supabase Storage
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSupabaseStorage() {
  try {
    console.log('🧪 Probando integración de Supabase Storage...')

    // 1. Verificar conexión
    console.log('1️⃣ Verificando conexión...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Error conectando a Supabase:', listError)
      return
    }

    console.log('✅ Conexión exitosa')

    // 2. Verificar bucket qr-images
    console.log('2️⃣ Verificando bucket qr-images...')
    const bucketExists = buckets.some(b => b.name === 'qr-images')

    if (!bucketExists) {
      console.error('❌ Bucket qr-images no encontrado')
      console.log('Ejecuta: node scripts/setup-supabase-storage.js')
      return
    }

    console.log('✅ Bucket qr-images encontrado')

    // 3. Probar upload de imagen de prueba
    console.log('3️⃣ Probando upload de imagen de prueba...')

    // Crear una imagen mínima (1x1 pixel PNG)
    const minimalPng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])

    const testFileName = `test-${Date.now()}.png`
    const testPath = `original/${testFileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('qr-images')
      .upload(testPath, minimalPng, {
        contentType: 'image/png',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Error en upload de prueba:', uploadError)
      console.log('⚠️  Posible causa: Políticas RLS no configuradas')
      console.log('Ejecuta: node scripts/setup-supabase-policies.js')
      return
    }

    console.log('✅ Upload de prueba exitoso')

    // 4. Verificar URL pública
    console.log('4️⃣ Verificando URL pública...')
    const { data: urlData } = supabase.storage
      .from('qr-images')
      .getPublicUrl(testPath)

    if (urlData.publicUrl) {
      console.log('✅ URL pública generada:', urlData.publicUrl)
    } else {
      console.error('❌ No se pudo generar URL pública')
    }

    // 5. Limpiar archivo de prueba
    console.log('5️⃣ Limpiando archivo de prueba...')
    const { error: deleteError } = await supabase.storage
      .from('qr-images')
      .remove([testPath])

    if (deleteError) {
      console.warn('⚠️  No se pudo eliminar archivo de prueba:', deleteError)
    } else {
      console.log('✅ Archivo de prueba eliminado')
    }

    console.log('')
    console.log('🎉 ¡Todas las pruebas pasaron exitosamente!')
    console.log('La integración de Supabase Storage está funcionando correctamente.')

  } catch (error) {
    console.error('❌ Error en pruebas:', error)
  }
}

testSupabaseStorage()