import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for public operations (uploads from client)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client for server operations (admin operations)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase

// Storage bucket name
export const STORAGE_BUCKET = 'qr-images'

// Storage folders
export const STORAGE_FOLDERS = {
  ORIGINAL: 'original',
  OPTIMIZED: 'optimized',
  TEMP: 'temp'
} as const

export type StorageFolder = typeof STORAGE_FOLDERS[keyof typeof STORAGE_FOLDERS]