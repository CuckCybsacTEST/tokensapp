import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Lazy validation - only check when actually using Supabase
const validateSupabaseConfig = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
}

// Lazy initialization for admin client
let _supabaseAdmin: any = null

// Client for server operations (admin operations)
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    if (!_supabaseAdmin) {
      validateSupabaseConfig()
      _supabaseAdmin = supabaseServiceKey
        ? createClient(supabaseUrl!, supabaseServiceKey)
        : createClient(supabaseUrl!, supabaseAnonKey!)
    }
    return _supabaseAdmin[prop]
  }
})

// Storage bucket names
export const STORAGE_BUCKET = 'qr-images'
export const BIRTHDAY_CARDS_BUCKET = 'birthday-cards'
export const BIRTHDAY_TEMPLATES_BUCKET = 'birthday-templates'
export const MENU_IMAGES_BUCKET = 'menu-images'
export const INVITATION_TEMPLATES_BUCKET = 'invitation-templates'

// Storage folders
export const MENU_FOLDERS = {
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  PROMOTIONS: 'promotions'
} as const

export type MenuFolder = typeof MENU_FOLDERS[keyof typeof MENU_FOLDERS]

// Safe file deletion
export async function safeDeleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch (error) {
    console.warn(`Failed to delete temp file ${filePath}:`, error)
  }
}

// Delete from Supabase storage
export async function deleteFromSupabase(
  storageKey: string,
  bucket: string = MENU_IMAGES_BUCKET
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([storageKey])

    if (error) {
      console.warn(`Failed to delete from Supabase ${storageKey}:`, error)
    }
  } catch (error) {
    console.warn(`Error deleting from Supabase ${storageKey}:`, error)
  }
}

// Upload menu image to Supabase storage
export async function uploadMenuImage(
  file: File,
  folder: MenuFolder,
  itemId: string
): Promise<{ url: string; storageKey: string }> {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${itemId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const storageKey = `${folder}/${fileName}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase
    const { data, error } = await supabaseAdmin.storage
      .from(MENU_IMAGES_BUCKET)
      .upload(storageKey, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(MENU_IMAGES_BUCKET)
      .getPublicUrl(storageKey)

    return {
      url: urlData.publicUrl,
      storageKey
    }
  } catch (error) {
    console.error('Error uploading menu image:', error)
    throw error
  }
}

// Delete menu image from Supabase storage
export async function deleteMenuImage(storageKey: string): Promise<void> {
  return deleteFromSupabase(storageKey, MENU_IMAGES_BUCKET)
}

// Upload buffer directly to Supabase storage
export async function uploadBufferToSupabase(
  buffer: Buffer,
  storageKey: string,
  contentType: string = 'image/png',
  bucket: string = STORAGE_BUCKET
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storageKey, buffer, {
        contentType,
        upsert: true
      })

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storageKey)

    return urlData.publicUrl
  } catch (error) {
    throw error
  }
}

// Upload file from temp path to Supabase storage
export async function uploadFileToSupabase(
  tempFilePath: string,
  storageKey: string,
  bucket: string = STORAGE_BUCKET
): Promise<{ url: string; storageKey: string }> {
  try {
    // Read file from temp
    const fileBuffer = await fs.readFile(tempFilePath)

    // Upload to Supabase
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storageKey, fileBuffer, {
        contentType: 'image/png', // Default, will be overridden by actual file type
        upsert: true
      })

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storageKey)

    // Clean up temp file
    await safeDeleteFile(tempFilePath)

    return {
      url: urlData.publicUrl,
      storageKey
    }
  } catch (error) {
    // Clean up temp file even on error
    await safeDeleteFile(tempFilePath)
    throw error
  }
}

// Generate temp file path
export function getTempFilePath(prefix: string, extension: string): string {
  const tempDir = process.env.TEMP_DIR || '/tmp'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return path.join(tempDir, `${prefix}-${timestamp}-${random}.${extension}`)
}