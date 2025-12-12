#!/usr/bin/env node

/**
 * Script para configurar políticas RLS en Supabase Storage
 * Ejecutar después del setup inicial del bucket
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStoragePolicies() {
  try {
    console.log('🔐 Configurando políticas RLS para Supabase Storage...')

    // Nota: Las políticas RLS para storage se configuran a través de SQL
    // Este script proporciona las instrucciones SQL para ejecutar manualmente

    console.log('')
    console.log('📋 Ejecuta estas consultas SQL en el SQL Editor de Supabase:')
    console.log('')

    console.log('```sql')
    console.log('-- Habilitar RLS en el bucket qr-images')
    console.log('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;')
    console.log('')

    console.log('-- Política para permitir uploads de imágenes (service role)')
    console.log('CREATE POLICY "Allow image uploads" ON storage.objects')
    console.log('FOR INSERT WITH CHECK (')
    console.log('  bucket_id = \'qr-images\'')
    console.log('  AND (storage.foldername(name))[1] IN (\'original\', \'optimized\')')
    console.log(');')
    console.log('')

    console.log('-- Política para permitir acceso público a las imágenes')
    console.log('CREATE POLICY "Allow public image access" ON storage.objects')
    console.log('FOR SELECT USING (bucket_id = \'qr-images\');')
    console.log('')

    console.log('-- Política para permitir updates (opcional, para reemplazos)')
    console.log('CREATE POLICY "Allow image updates" ON storage.objects')
    console.log('FOR UPDATE USING (bucket_id = \'qr-images\');')
    console.log('```')

    console.log('')
    console.log('🌐 O alternativamente, desde el Dashboard:')
    console.log('1. Ve a Storage → qr-images → Policies')
    console.log('2. Crea una nueva política:')
    console.log('   - Name: "Public Access"')
    console.log('   - Allowed operations: SELECT')
    console.log('   - Policy definition: bucket_id = qr-images')
    console.log('3. Crea otra política:')
    console.log('   - Name: "Upload Access"')
    console.log('   - Allowed operations: INSERT')
    console.log('   - Policy definition: bucket_id = qr-images AND (storage.foldername(name))[1] IN (\'original\', \'optimized\')')

    console.log('')
    console.log('✅ Una vez configuradas las políticas, las imágenes se podrán subir correctamente.')

  } catch (error) {
    console.error('❌ Error configurando políticas:', error)
  }
}

setupStoragePolicies()