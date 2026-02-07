import { createClient } from '@supabase/supabase-js'

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

// Storage bucket names
export const STORAGE_BUCKET = 'qr-images'
export const BIRTHDAY_CARDS_BUCKET = 'birthday-cards'
export const BIRTHDAY_TEMPLATES_BUCKET = 'birthday-templates'
export const MENU_IMAGES_BUCKET = 'menu-images'
export const INVITATION_TEMPLATES_BUCKET = 'invitation-templates'

// Storage folders (for qr-images bucket)
export const STORAGE_FOLDERS = {
  ORIGINAL: 'original',
  OPTIMIZED: 'optimized',
  TEMP: 'temp',
  TEMPLATES: 'templates',
  INVITE_CARDS: 'invite-cards'
} as const

// Menu images folders
export const MENU_FOLDERS = {
  PRODUCTS: 'products',
  PROMOTIONS: 'promotions',
  CATEGORIES: 'categories'
} as const

export type MenuFolder = typeof MENU_FOLDERS[keyof typeof MENU_FOLDERS]