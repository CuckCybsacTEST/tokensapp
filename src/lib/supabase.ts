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

// Lazy initialization for clients
let _supabase: any = null
let _supabaseAdmin: any = null

// Client for public operations (uploads from client)
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!_supabase) {
      validateSupabaseConfig()
      _supabase = createClient(supabaseUrl!, supabaseAnonKey!)
    }
    return _supabase[prop]
  }
})

// Client for server operations (admin operations)
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    if (!_supabaseAdmin) {
      validateSupabaseConfig()
      _supabaseAdmin = supabaseServiceKey
        ? createClient(supabaseUrl!, supabaseServiceKey)
        : _supabase || createClient(supabaseUrl!, supabaseAnonKey!)
    }
    return _supabaseAdmin[prop]
  }
})

// Storage bucket name
export const STORAGE_BUCKET = 'qr-images'

// Storage folders
export const STORAGE_FOLDERS = {
  ORIGINAL: 'original',
  OPTIMIZED: 'optimized',
  TEMP: 'temp',
  TEMPLATES: 'templates',
  BIRTHDAY_CARDS: 'birthday-cards',
  INVITE_CARDS: 'invite-cards'
} as const

export type StorageFolder = typeof STORAGE_FOLDERS[keyof typeof STORAGE_FOLDERS]

// Safe file deletion - ignores ENOENT errors
export async function safeDeleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch (error: any) {
    // Ignore ENOENT (file not found) errors
    if (error.code !== 'ENOENT') {
      console.warn(`Failed to delete file ${filePath}:`, error)
    }
  }
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

// Delete from Supabase storage
export async function deleteFromSupabase(
  storageKey: string,
  bucket: string = STORAGE_BUCKET
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

// Generate temp file path
export function getTempFilePath(prefix: string, extension: string): string {
  const tempDir = process.env.TEMP_DIR || '/tmp'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return path.join(tempDir, `${prefix}-${timestamp}-${random}.${extension}`)
}

// Storage provider types
export type StorageProvider = 'supabase' | 'local'

// Storage reference for database
export interface StorageRef {
  storageProvider: StorageProvider
  storageKey: string
  url?: string // Optional cached URL
}