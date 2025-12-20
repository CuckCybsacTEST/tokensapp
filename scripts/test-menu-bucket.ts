import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testMenuBucket() {
  console.log('🧪 Testing menu-images bucket...')

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      return
    }

    const bucket = buckets.find(b => b.name === 'menu-images')

    if (!bucket) {
      console.error('❌ Bucket menu-images does not exist')
      console.log('💡 Run: npx tsx scripts/setup-menu-bucket.ts')
      return
    }

    console.log('✅ Bucket menu-images exists')

    // Test upload permissions (we'll upload a small test image)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    const testImageBuffer = Buffer.from(testImageData, 'base64')
    const testFile = new File([testImageBuffer], 'test.png', { type: 'image/png' })
    const testKey = `test-${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(testKey, testFile)

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError)
      return
    }

    console.log('✅ Upload test successful')

    // Clean up test file
    await supabase.storage
      .from('menu-images')
      .remove([testKey])

    console.log('✅ Test file cleaned up')
    console.log('🎉 menu-images bucket is ready!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testMenuBucket()