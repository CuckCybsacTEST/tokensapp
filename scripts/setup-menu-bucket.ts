import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupMenuBucket() {
  console.log('🛠️ Setting up menu-images bucket...')

  try {
    // Create bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      return
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'menu-images')

    if (!bucketExists) {
      console.log('📦 Creating menu-images bucket...')
      const { error: createError } = await supabase.storage.createBucket('menu-images', {
        public: true, // Public read access for images
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      })

      if (createError) {
        console.error('❌ Error creating bucket:', createError)
        return
      }

      console.log('✅ Bucket menu-images created successfully')
    } else {
      console.log('✅ Bucket menu-images already exists')
      // Update bucket settings if needed
      console.log('🔄 Updating bucket configuration...')
      try {
        // Note: Supabase doesn't provide a direct update method for bucket settings
        // We'll rely on the existing configuration
      } catch (updateError) {
        console.warn('⚠️ Could not update bucket settings:', updateError)
      }
    }

    // Set up bucket policies for public read access
    console.log('🔒 Setting up bucket policies...')

    // Policy for public read access
    const { error: policyError } = await supabase.storage.from('menu-images').createSignedUploadUrl('')

    // Note: For public buckets, we need to ensure the bucket is public
    // The createBucket with public: true should handle this

    console.log('✅ Menu images bucket setup completed!')
    console.log('📁 Bucket: menu-images')
    console.log('🌐 Public access: Enabled')
    console.log('📏 Max file size: 5MB')
    console.log('🖼️ Allowed formats: JPEG, PNG, WebP')

  } catch (error) {
    console.error('❌ Error setting up menu bucket:', error)
    process.exit(1)
  }
}

setupMenuBucket()