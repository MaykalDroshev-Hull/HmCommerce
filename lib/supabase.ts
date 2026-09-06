import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'placeholder-anon-key'
const FALLBACK_SERVICE_KEY = 'placeholder-service-key'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY

function createSupabaseClient() {
  const client = createClient(supabaseUrl, supabaseAnonKey)

  if (process.env.NODE_ENV === 'development') {
    logger.debug('Supabase client connected', {
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      storageAvailable: !!client.storage,
    })
  }

  return client
}

// Client-side Supabase client (for browser use)
// Safe during build time and SSR even if env vars are missing
export const supabase = createSupabaseClient()

// Server-side Supabase client (for API routes - bypasses RLS)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    FALLBACK_SERVICE_KEY

  const client = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    logger.debug('Supabase server client connected', {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    })
  }

  return client
}


